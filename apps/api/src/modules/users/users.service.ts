import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {Prisma, UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {OPEN_LEAD_STATUSES} from "@/modules/leads/lead.constants";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {UpdateUserPasswordDto} from "./dto/update-user-password.dto";
import {DeactivateUserDto} from "./dto/deactivate-user.dto";
import {TransferUserBranchDto} from "./dto/transfer-user-branch.dto";
import {QueryUsersDto} from "./dto/query-users.dto";
import {canActorSeeRole, getManageableRoles} from "@/modules/users/users.constants";

const USER_SAFE_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
    companyId: true,
    branchId: true,
    branch: {
        select: {id: true, name: true},
    },
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryUsersDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const manageableRoles = getManageableRoles(user.role);

        const where: Prisma.UserWhereInput = {
            companyId: user.companyId,
            deletedAt: null,
            isActive: query.isActive ?? true,
            // Without this a COMPANY_ADMIN can enumerate SUPER_ADMIN accounts,
            // which findOne() already refuses to return.
            role: { in: manageableRoles },
        };

        if (query.role) {
            if (!manageableRoles.includes(query.role)) {
                throw new ForbiddenException("You cannot view users with this role");
            }
            where.role = query.role;
        }

        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
            ];
        }

        if (query.branchId) {
            where.branchId = query.branchId;
        }

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fullName: "asc" },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    branchId: true,
                    branch: {
                        select: {id: true, name: true},
                    },
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.prisma.user.findFirst({
            where: { id, companyId: user.companyId },
            select: USER_SAFE_SELECT,
        });

        if (!target || !canActorSeeRole(user.role, target.role)) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    async create(user: AuthUser, dto: CreateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        this.ensureCanAssignRole(user, dto.role);

        await this.ensureEmailIsUnique(dto.email);

        await this.ensureBranchAssignmentValid(user.companyId, dto.role, dto.branchId);

        const passwordHash = await bcrypt.hash(dto.password, 10);

        return this.prisma.user.create({
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                role: dto.role,
                companyId: user.companyId,
                branchId: dto.branchId,
            },
            select: USER_SAFE_SELECT,
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.getManageableTargetOrThrow(user, id);

        if (dto.role !== undefined) {
            this.ensureCanAssignRole(user, dto.role);
        }

        if (dto.email && dto.email !== target.email) {
            await this.ensureEmailIsUnique(dto.email, id);
        }

        if (dto.isActive === false && target.id === user.id) {
            throw new BadRequestException("You cannot deactivate your own account");
        }

        if (dto.role !== undefined || dto.branchId !== undefined) {
            const effectiveRole = dto.role ?? target.role;
            const effectiveBranchId = dto.branchId !== undefined ? dto.branchId : target.branchId;
            await this.ensureBranchAssignmentValid(user.companyId, effectiveRole, effectiveBranchId);
        }

        const rolesChanged = dto.role !== undefined && dto.role !== target.role;
        const beingDeactivated = dto.isActive === false && target.isActive === true;

        return this.prisma.user.update({
            where: { id },
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                role: dto.role,
                branchId: dto.branchId,
                isActive: dto.isActive,
                ...(rolesChanged || beingDeactivated ? { sessionsValidFrom: new Date() } : {}),
            },
            select: USER_SAFE_SELECT,
        });
    }

    /**
     * Counts the open leads and active deals a user currently manages, so the
     * caller can decide whether to reassign them before transferring the user
     * to another branch — see transferBranch() below.
     */
    async getBranchTransferImpact(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.getManageableTargetOrThrow(user, id);

        const [openLeads, activeDeals] = await Promise.all([
            this.prisma.lead.count({
                where: {
                    companyId: user.companyId,
                    managerId: id,
                    deletedAt: null,
                    status: { in: OPEN_LEAD_STATUSES },
                },
            }),
            this.prisma.deal.count({
                where: {
                    companyId: user.companyId,
                    managerId: id,
                    deletedAt: null,
                    status: { in: ACTIVE_DEAL_STATUSES },
                },
            }),
        ]);

        return { openLeads, activeDeals };
    }

    /**
     * Moves a branch-scoped user to another branch (BR-A3). Their existing
     * open leads/active deals keep their current branchId and managerId
     * unless a replacement is given — reassigning them is opt-in, exactly
     * like remove()'s reassignment step, and runs in the same transaction as
     * the branch change so a mid-way failure never leaves the user moved with
     * half their pipeline unaccounted for.
     */
    async transferBranch(user: AuthUser, id: string, dto: TransferUserBranchDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const target = await this.getManageableTargetOrThrow(user, id);

        if (!isBranchScopedRole(target.role)) {
            throw new BadRequestException("This user's role is not branch-scoped");
        }

        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId, deactivatedAt: null },
        });

        if (!branch) {
            throw new BadRequestException("Branch does not belong to your company or is deactivated");
        }

        const reassignToId = dto.reassignToId;

        if (reassignToId) {
            if (reassignToId === id) {
                throw new BadRequestException("Cannot reassign to the user being transferred");
            }

            const replacement = await this.getManageableTargetOrThrow(user, reassignToId);

            if (!replacement.isActive) {
                throw new BadRequestException("Cannot reassign to an inactive user");
            }
        }

        await this.prisma.$transaction(async (db) => {
            if (reassignToId) {
                await db.lead.updateMany({
                    where: {
                        companyId,
                        managerId: id,
                        deletedAt: null,
                        status: { in: OPEN_LEAD_STATUSES },
                    },
                    data: { managerId: reassignToId },
                });

                await db.deal.updateMany({
                    where: {
                        companyId,
                        managerId: id,
                        deletedAt: null,
                        status: { in: ACTIVE_DEAL_STATUSES },
                    },
                    data: { managerId: reassignToId },
                });
            }

            await db.user.update({
                where: { id },
                data: { branchId: dto.branchId },
            });
        });

        return { success: true };
    }

    async updatePassword(user: AuthUser, id: string, dto: UpdateUserPasswordDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.getManageableTargetOrThrow(user, id);

        const passwordHash = await bcrypt.hash(dto.password, 10);

        await this.prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                sessionsValidFrom: new Date()
            },
        });

        return { success: true };
    }

    async revokeSessions(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.getManageableTargetOrThrow(user, id);

        await this.prisma.user.update({
            where: { id },
            data: { sessionsValidFrom: new Date() },
        });

        return { success: true };
    }

    /**
     * Counts the open leads and active deals a user currently manages, so the
     * caller can decide whether to reassign them before deactivating — see
     * remove() below. Not itself a mutation; safe to poll from a confirmation
     * dialog.
     */
    async getDeactivationImpact(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.getManageableTargetOrThrow(user, id);

        const [openLeads, activeDeals] = await Promise.all([
            this.prisma.lead.count({
                where: {
                    companyId: user.companyId,
                    managerId: id,
                    deletedAt: null,
                    status: { in: OPEN_LEAD_STATUSES },
                },
            }),
            this.prisma.deal.count({
                where: {
                    companyId: user.companyId,
                    managerId: id,
                    deletedAt: null,
                    status: { in: ACTIVE_DEAL_STATUSES },
                },
            }),
        ]);

        return { openLeads, activeDeals };
    }

    /**
     * Deactivates a user (soft-delete). Optionally reassigns their open leads
     * and in-progress deals to a replacement manager first — in the same
     * transaction, so a mid-way failure can never leave the user deactivated
     * with half their pipeline moved. Reassignment is opt-in: pass nothing and
     * the records simply keep their old managerId, same as before this story.
     */
    async remove(user: AuthUser, id: string, dto?: DeactivateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        if (id === user.id) {
            throw new BadRequestException("You cannot delete your own account");
        }

        await this.getManageableTargetOrThrow(user, id);

        const reassignToId = dto?.reassignToId;

        if (reassignToId) {
            if (reassignToId === id) {
                throw new BadRequestException("Cannot reassign to the user being deactivated");
            }

            const replacement = await this.getManageableTargetOrThrow(user, reassignToId);

            if (!replacement.isActive) {
                throw new BadRequestException("Cannot reassign to an inactive user");
            }
        }

        await this.prisma.$transaction(async (db) => {
            if (reassignToId) {
                await db.lead.updateMany({
                    where: {
                        companyId,
                        managerId: id,
                        deletedAt: null,
                        status: { in: OPEN_LEAD_STATUSES },
                    },
                    data: { managerId: reassignToId },
                });

                await db.deal.updateMany({
                    where: {
                        companyId,
                        managerId: id,
                        deletedAt: null,
                        status: { in: ACTIVE_DEAL_STATUSES },
                    },
                    data: { managerId: reassignToId },
                });
            }

            await db.user.update({
                where: { id },
                data: {
                    isActive: false,
                    deletedAt: new Date(),
                },
            });
        });

        return { success: true };
    }

    // --------------------------------------------------------------------
    // Used internally by AuthModule — unchanged signatures
    // --------------------------------------------------------------------

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { company: true, branch: true },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { company: true, branch: true },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }

    /**
     * Loads a user the actor is allowed to act on, or throws.
     *
     * Three conditions, all of which were missing from update(),
     * updatePassword(), revokeSessions() and remove(): the target must be in
     * the actor's company, must not already be soft-deleted, and must hold a
     * role the actor may manage. Without the last one a COMPANY_ADMIN could
     * reset a SUPER_ADMIN's password or delete the account outright.
     *
     * Returns 404 rather than 403 for a role the actor may not see, matching
     * findOne() — a company admin should not be able to discover that a
     * SUPER_ADMIN exists by probing ids.
     */
    private async getManageableTargetOrThrow(actor: AuthUser, id: string) {
        const target = await this.prisma.user.findFirst({
            where: { id, companyId: actor.companyId, deletedAt: null },
        });

        if (!target || !canActorSeeRole(actor.role, target.role)) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    /**
     * A user can never grant a role they could not otherwise manage. This is
     * what stops a COMPANY_ADMIN creating a SUPER_ADMIN, or promoting a second
     * account of their own to one.
     */
    private ensureCanAssignRole(actor: AuthUser, role: UserRole) {
        if (!canActorSeeRole(actor.role, role)) {
            throw new ForbiddenException("You cannot assign this role");
        }
    }

    /**
     * Branch-scoped roles (SALES_HEAD, SALES_MANAGER) must have a branch;
     * company-wide roles (COMPANY_ADMIN, FINANCE) must not — an unscoped
     * account is not a valid state to save for either.
     */
    private async ensureBranchAssignmentValid(
        companyId: string | null,
        role: UserRole,
        branchId?: string | null,
    ) {
        if (!companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (isBranchScopedRole(role)) {
            if (!branchId) {
                throw new BadRequestException("This role requires a branch");
            }

            const branch = await this.prisma.branch.findFirst({
                where: { id: branchId, companyId, deactivatedAt: null },
            });

            if (!branch) {
                throw new BadRequestException("Branch does not belong to your company or is deactivated");
            }
        } else if (branchId) {
            throw new BadRequestException("This role cannot be assigned to a branch");
        }
    }

    private async ensureEmailIsUnique(email: string, exceptUserId?: string) {
        const existing = await this.prisma.user.findFirst({
            where: {
                email,
                id: exceptUserId ? { not: exceptUserId } : undefined,
            },
        });

        if (existing) {
            throw new ConflictException("User with this email already exists");
        }
    }

    async getRoleSummary(user: AuthUser) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const visibleRoles = getManageableRoles(user.role);

        const [counts, samples] = await Promise.all([
            this.prisma.user.groupBy({
                by: ["role"],
                where: {
                    companyId: user.companyId,
                    role: { in: visibleRoles },
                    deletedAt: null,
                },
                _count: { _all: true },
            }),
            
            Promise.all(
                visibleRoles.map((role) =>
                    this.prisma.user.findMany({
                        where: {
                            companyId: user.companyId,
                            role,
                            deletedAt: null,
                        },
                        orderBy: { createdAt: "desc" },
                        take: 3,
                        select: { id: true, fullName: true },
                    }),
                ),
            ),
        ]);

        const countByRole = new Map(counts.map((c) => [c.role, c._count._all]));

        return visibleRoles.map((role, index) => ({
            role,
            count: countByRole.get(role) ?? 0,
            sample: samples[index],
        }));
    }
}