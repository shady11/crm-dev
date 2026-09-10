import {BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {randomBytes} from "crypto";
import * as bcrypt from "bcrypt";
import {AuditAction, Prisma, UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {ImpersonationService} from "@/modules/impersonation/impersonation.service";
import {SettingOptionsService} from "@/modules/setting-options/setting-options.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateCompanyDto} from "./dto/create-company.dto";
import {UpdateCompanyDto} from "./dto/update-company.dto";
import {UpdateOwnCompanyDto} from "./dto/update-own-company.dto";
import {QueryCompaniesDto} from "./dto/query-companies.dto";

/**
 * Defaults for the pilot market. Applied here rather than in the DTO so a
 * tenant created with the fields omitted still gets a real currency — a null
 * one renders as a dollar sign in the UI no matter where the company is.
 */
const DEFAULTS = {
    currency: "KGS",
    locale: "ru-RU",
    timezone: "Asia/Bishkek",
} as const;

const COMPANY_SELECT = {
    id: true,
    name: true,
    phone: true,
    address: true,
    currency: true,
    locale: true,
    timezone: true,
    suspendedAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.CompanySelect;

@Injectable()
export class CompaniesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
        private readonly impersonation: ImpersonationService,
        private readonly settingOptions: SettingOptionsService,
    ) {}

    /**
     * Rejects a currency/locale/timezone that isn't an active SettingOption —
     * the same list the web pickers are built from — so a company can never
     * end up with a value nobody could have actually selected.
     */
    private async assertValidSettings(dto: {
        currency?: string;
        locale?: string;
        timezone?: string;
    }): Promise<void> {
        if (dto.currency) {
            await this.settingOptions.assertActiveOption("CURRENCY", dto.currency.trim());
        }

        if (dto.locale) {
            await this.settingOptions.assertActiveOption("LOCALE", dto.locale.trim());
        }

        if (dto.timezone) {
            await this.settingOptions.assertActiveOption("TIMEZONE", dto.timezone.trim());
        }
    }

    /**
     * salesHeadDiscountLimit must be >= salesManagerDiscountLimit — checked
     * against the *effective* values, since a partial update can send either
     * threshold alone (see UpdateOwnCompanyDto).
     */
    private async assertValidDiscountThresholds(id: string, dto: unknown): Promise<void> {
        // UpdateCompanyDto (the platform operator's DTO) never carries these
        // — only UpdateOwnCompanyDto does. Typed `unknown` and read
        // defensively so update() can call this unconditionally for either.
        const {salesManagerDiscountLimit, salesHeadDiscountLimit} = dto as {
            salesManagerDiscountLimit?: number;
            salesHeadDiscountLimit?: number;
        };

        if (salesManagerDiscountLimit === undefined && salesHeadDiscountLimit === undefined) {
            return;
        }

        const current = await this.prisma.company.findUniqueOrThrow({
            where: {id},
            select: {salesManagerDiscountLimit: true, salesHeadDiscountLimit: true},
        });

        const managerLimit = salesManagerDiscountLimit ?? current.salesManagerDiscountLimit.toNumber();
        const headLimit = salesHeadDiscountLimit ?? current.salesHeadDiscountLimit.toNumber();

        if (headLimit < managerLimit) {
            throw new BadRequestException(
                "salesHeadDiscountLimit must be greater than or equal to salesManagerDiscountLimit",
            );
        }
    }

    async findAll(query: QueryCompaniesDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        // Deleted tenants never appear. Suspended ones do — they are the rows
        // an operator most needs to see.
        const where: Prisma.CompanyWhereInput = {deletedAt: null};

        if (query.search) {
            where.name = {contains: query.search, mode: "insensitive"};
        }

        if (query.status === "suspended") {
            where.suspendedAt = {not: null};
        } else if (query.status === "active") {
            where.suspendedAt = null;
        }

        const [items, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {name: "asc"},
                select: {
                    ...COMPANY_SELECT,
                    _count: {
                        select: {
                            users: {where: {deletedAt: null}},
                            projects: {where: {deletedAt: null}},
                        },
                    },
                },
            }),
            this.prisma.company.count({where}),
        ]);

        return {
            items,
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }

    async findOne(id: string) {
        const company = await this.prisma.company.findFirst({
            where: {id, deletedAt: null},
            select: {
                ...COMPANY_SELECT,
                phone: true,
                address: true,
                users: {
                    where: {deletedAt: null},
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                    orderBy: [{role: "asc"}, {fullName: "asc"}],
                },
            },
        });

        if (!company) {
            throw new NotFoundException("Company not found");
        }

        // Counted separately rather than through _count because units belong to
        // a company only through their project, and deals are wanted split by
        // "currently in play" versus total.
        const [projects, units, clients, leads, deals, activeDeals] = await Promise.all([
            this.prisma.project.count({where: {companyId: id, deletedAt: null}}),
            this.prisma.unit.count({where: {project: {companyId: id}, deletedAt: null}}),
            this.prisma.client.count({where: {companyId: id, deletedAt: null}}),
            this.prisma.lead.count({where: {companyId: id, deletedAt: null}}),
            this.prisma.deal.count({where: {companyId: id, deletedAt: null}}),
            this.prisma.deal.count({
                where: {companyId: id, deletedAt: null, status: {in: ACTIVE_DEAL_STATUSES}},
            }),
        ]);

        const {users, ...rest} = company;

        return {
            ...rest,
            users,
            stats: {
                users: users.length,
                activeUsers: users.filter((user) => user.isActive).length,
                projects,
                units,
                clients,
                leads,
                deals,
                activeDeals,
            },
        };
    }

    /**
     * Creates the tenant and its first administrator together, in one
     * transaction. A company with no administrator cannot be logged into and
     * cannot create one, so splitting these into two calls only creates a state
     * where the second can fail and leave an unusable tenant behind.
     *
     * The generated password is returned exactly once, in this response. It is
     * never stored in plaintext and cannot be read back afterwards.
     */
    async create(actor: AuthUser, dto: CreateCompanyDto) {
        const adminEmail = dto.adminEmail.trim().toLowerCase();

        const existingUser = await this.prisma.user.findUnique({where: {email: adminEmail}});

        if (existingUser) {
            throw new ConflictException("A user with this email already exists");
        }

        const existingCompany = await this.prisma.company.findFirst({
            where: {name: dto.name, deletedAt: null},
        });

        if (existingCompany) {
            throw new ConflictException("A company with this name already exists");
        }

        await this.assertValidSettings(dto);

        const password = dto.adminPassword?.trim() || randomBytes(18).toString("base64url");
        const passwordHash = await bcrypt.hash(password, 10);

        const company = await this.prisma.$transaction(async (db) => {
            const created = await db.company.create({
                data: {
                    name: dto.name,
                    phone: dto.phone,
                    address: dto.address,
                    currency: dto.currency?.trim() || DEFAULTS.currency,
                    locale: dto.locale?.trim() || DEFAULTS.locale,
                    timezone: dto.timezone?.trim() || DEFAULTS.timezone,
                },
                select: COMPANY_SELECT,
            });

            await db.user.create({
                data: {
                    fullName: dto.adminFullName,
                    email: adminEmail,
                    passwordHash,
                    role: UserRole.COMPANY_ADMIN,
                    companyId: created.id,
                },
            });

            return created;
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_CREATED,
            targetType: "Company",
            targetId: company.id,
            companyId: company.id,
            metadata: {name: company.name, adminEmail},
        });

        return {
            company,
            admin: {
                email: adminEmail,
                // Returned once so it can be handed over; absent on every later read.
                generatedPassword: dto.adminPassword ? undefined : password,
            },
        };
    }

    /**
     * The COMPANY_ADMIN self-service counterpart to findOne()/update() below —
     * scoped to the actor's own companyId, which comes from the JWT-derived
     * AuthUser and never from a client-supplied id. That's what keeps a
     * COMPANY_ADMIN from ever reading or editing a tenant other than their own
     * through this path.
     */
    async findOwn(actor: AuthUser) {
        if (!actor.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const company = await this.prisma.company.findFirst({
            where: {id: actor.companyId, deletedAt: null},
            select: COMPANY_SELECT,
        });

        if (!company) {
            throw new NotFoundException("Company not found");
        }

        return company;
    }

    /**
     * Same scoping as findOwn(), plus the narrower UpdateOwnCompanyDto (no
     * phone/address) so a COMPANY_ADMIN can fix their own currency/locale/
     * timezone/name without a support ticket to the platform operator.
     */
    async updateOwn(actor: AuthUser, dto: UpdateOwnCompanyDto) {
        if (!actor.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        return this.update(actor.companyId, dto);
    }

    /**
     * Every Payment/Deal amount is a plain Decimal with no currency column of
     * its own — currency lives once, on Company. Changing it after deals
     * exist doesn't convert anything already recorded, so a KGS deal would
     * silently start reading as USD. Until the model supports a currency per
     * deal, changing it once real deals exist is a data-corrupting operation,
     * not a settings tweak — so it's refused rather than silently allowed.
     */
    private async assertCurrencyIsUnlocked(id: string, dto: {currency?: string}): Promise<void> {
        if (!dto.currency) {
            return;
        }

        const current = await this.prisma.company.findUniqueOrThrow({
            where: {id},
            select: {currency: true},
        });

        if (current.currency && dto.currency.trim() === current.currency) {
            return;
        }

        const dealCount = await this.prisma.deal.count({where: {companyId: id}});

        if (dealCount > 0) {
            throw new BadRequestException(
                "Currency cannot be changed once deals exist — amounts already recorded would be " +
                "silently reinterpreted in the new currency. Contact support if this tenant genuinely " +
                "needs to switch currencies.",
            );
        }
    }

    async update(id: string, dto: UpdateCompanyDto) {
        await this.findOne(id);
        await this.assertValidSettings(dto);
        await this.assertCurrencyIsUnlocked(id, dto);
        await this.assertValidDiscountThresholds(id, dto);

        if (dto.name) {
            const clash = await this.prisma.company.findFirst({
                where: {name: dto.name, deletedAt: null, id: {not: id}},
            });

            if (clash) {
                throw new ConflictException("A company with this name already exists");
            }
        }

        return this.prisma.company.update({
            where: {id},
            data: dto,
            select: COMPANY_SELECT,
        });
    }

    /**
     * Suspends a tenant. Reversible.
     *
     * Only this one field changes. Nothing touches the tenant's user accounts,
     * because SessionValidationService and login both refuse a user whose
     * company is suspended — so every session stops on its next request, and
     * resuming does not have to reconstruct which accounts were already
     * inactive before the suspension.
     */
    async suspend(actor: AuthUser, id: string) {
        const company = await this.findOne(id);

        if (company.suspendedAt) {
            throw new ConflictException("This company is already suspended");
        }

        const updated = await this.prisma.company.update({
            where: {id},
            data: {suspendedAt: new Date()},
            select: COMPANY_SELECT,
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_SUSPENDED,
            targetType: "Company",
            targetId: id,
            companyId: id,
        });

        return updated;
    }

    async resume(actor: AuthUser, id: string) {
        const company = await this.findOne(id);

        if (!company.suspendedAt) {
            throw new ConflictException("This company is not suspended");
        }

        const updated = await this.prisma.company.update({
            where: {id},
            data: {suspendedAt: null},
            select: COMPANY_SELECT,
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_RESUMED,
            targetType: "Company",
            targetId: id,
            companyId: id,
        });

        return updated;
    }

    /**
     * Deletes a tenant. Soft, but treated as permanent: the row stops appearing
     * anywhere and its users can no longer log in, by the same company check
     * that enforces suspension.
     *
     * Deliberately does not cascade to the tenant's data. A developer's deals
     * and payment history are the records they would need if they ever came
     * back or disputed something, and destroying them on one click is not a
     * decision this endpoint should be able to make.
     */
    async remove(actor: AuthUser, id: string) {
        await this.findOne(id);

        await this.prisma.company.update({
            where: {id},
            data: {deletedAt: new Date()},
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_DELETED,
            targetType: "Company",
            targetId: id,
            companyId: id,
        });

        return {success: true};
    }

    /**
     * Loads a tenant's user, scoped to that tenant. Used by the three
     * intervention actions below — deliberately requires companyId to match
     * the URL's tenant, which is also what keeps a SUPER_ADMIN target (whose
     * companyId is always null) unreachable through this path.
     */
    private async getTenantUserOrThrow(companyId: string, userId: string) {
        const target = await this.prisma.user.findFirst({
            where: {id: userId, companyId, deletedAt: null},
        });

        if (!target) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    /**
     * Deactivates a tenant's user. For when the tenant's own COMPANY_ADMIN is
     * unreachable, or is the person locked out. Bumps sessionsValidFrom so any
     * session the user already holds stops on its next request.
     */
    async deactivateUser(actor: AuthUser, companyId: string, userId: string) {
        const target = await this.getTenantUserOrThrow(companyId, userId);

        if (!target.isActive) {
            throw new ConflictException("This user is already deactivated");
        }

        await this.prisma.user.update({
            where: {id: userId},
            data: {isActive: false, sessionsValidFrom: new Date()},
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_USER_DEACTIVATED,
            targetType: "User",
            targetId: userId,
            companyId,
            metadata: {email: target.email},
        });

        return {success: true};
    }

    // Reverses deactivateUser, kept as a separate endpoint for the same reason
    // suspend/resume are: a mistyped payload cannot turn one into the other.
    async reactivateUser(actor: AuthUser, companyId: string, userId: string) {
        const target = await this.getTenantUserOrThrow(companyId, userId);

        if (target.isActive) {
            throw new ConflictException("This user is not deactivated");
        }

        await this.prisma.user.update({
            where: {id: userId},
            data: {isActive: true},
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_USER_REACTIVATED,
            targetType: "User",
            targetId: userId,
            companyId,
            metadata: {email: target.email},
        });

        return {success: true};
    }

    /**
     * Resets a tenant user's password to a freshly generated one, returned
     * exactly once — the same shape and never-stored-in-plaintext guarantee as
     * the admin password generated on tenant creation. Never reads the old
     * password; bumps sessionsValidFrom so a leaked old password stops working
     * immediately.
     */
    async resetUserPassword(actor: AuthUser, companyId: string, userId: string) {
        const target = await this.getTenantUserOrThrow(companyId, userId);

        const password = randomBytes(18).toString("base64url");
        const passwordHash = await bcrypt.hash(password, 10);

        await this.prisma.user.update({
            where: {id: userId},
            data: {passwordHash, sessionsValidFrom: new Date()},
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.TENANT_USER_PASSWORD_RESET,
            targetType: "User",
            targetId: userId,
            companyId,
            metadata: {email: target.email},
        });

        return {email: target.email, generatedPassword: password};
    }

    /**
     * Starts a time-limited impersonation session for support: the SUPER_ADMIN
     * gets a token scoped to exactly this user's own permissions, never
     * elevated beyond what they have. Impersonating a SUPER_ADMIN account is
     * never permitted, even by another SUPER_ADMIN — enforced explicitly here
     * even though a SUPER_ADMIN target (companyId: null) could never match the
     * tenant-scoped lookup below in the first place.
     */
    async impersonateUser(actor: AuthUser, companyId: string, userId: string) {
        const company = await this.prisma.company.findFirst({
            where: {id: companyId, deletedAt: null},
            select: {id: true, name: true, currency: true, locale: true, timezone: true, suspendedAt: true},
        });

        if (!company) {
            throw new NotFoundException("Company not found");
        }

        if (company.suspendedAt) {
            throw new ConflictException("This company is suspended");
        }

        const target = await this.getTenantUserOrThrow(companyId, userId);

        if (target.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("SUPER_ADMIN accounts cannot be impersonated");
        }

        if (!target.isActive) {
            throw new ConflictException("This user is deactivated");
        }

        return this.impersonation.start(
            actor,
            {
                id: target.id,
                email: target.email,
                fullName: target.fullName,
                role: target.role,
                companyId,
                branchId: target.branchId,
                phone: target.phone,
            },
            {
                id: company.id,
                name: company.name,
                currency: company.currency,
                locale: company.locale,
                timezone: company.timezone,
            },
        );
    }
}
