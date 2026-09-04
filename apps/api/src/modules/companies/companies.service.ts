import {ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {randomBytes} from "crypto";
import * as bcrypt from "bcrypt";
import {Prisma, UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {CreateCompanyDto} from "./dto/create-company.dto";
import {UpdateCompanyDto} from "./dto/update-company.dto";
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
    constructor(private readonly prisma: PrismaService) {}

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
    async create(dto: CreateCompanyDto) {
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

        return {
            company,
            admin: {
                email: adminEmail,
                // Returned once so it can be handed over; absent on every later read.
                generatedPassword: dto.adminPassword ? undefined : password,
            },
        };
    }

    async update(id: string, dto: UpdateCompanyDto) {
        await this.findOne(id);

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
    async suspend(id: string) {
        const company = await this.findOne(id);

        if (company.suspendedAt) {
            throw new ConflictException("This company is already suspended");
        }

        return this.prisma.company.update({
            where: {id},
            data: {suspendedAt: new Date()},
            select: COMPANY_SELECT,
        });
    }

    async resume(id: string) {
        const company = await this.findOne(id);

        if (!company.suspendedAt) {
            throw new ConflictException("This company is not suspended");
        }

        return this.prisma.company.update({
            where: {id},
            data: {suspendedAt: null},
            select: COMPANY_SELECT,
        });
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
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.company.update({
            where: {id},
            data: {deletedAt: new Date()},
        });

        return {success: true};
    }
}
