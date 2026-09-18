import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {ActivityAction, ActivityType, Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {OPEN_LEAD_STATUSES} from "@/modules/leads/lead.constants";
import {diffChangedFields} from "@/common/utils/activity-diff.util";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {UpdateUserPasswordDto} from "./dto/update-user-password.dto";
import {DeactivateUserDto} from "./dto/deactivate-user.dto";
import {TransferUserBranchDto} from "./dto/transfer-user-branch.dto";
import {QueryUsersDto, USER_SORTABLE_FIELDS} from "./dto/query-users.dto";
import {resolveOrderBy} from "@/common/utils/sort.util";
import {canActorSeeUser} from "@/modules/users/users.constants";

const USER_SAFE_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    roleId: true,
    role: {select: {id: true, name: true, isBranchScoped: true}},
    isSuperAdmin: true,
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

    /**
     * Records a company-scoped activity for an action taken on a user
     * account (as opposed to `activities`, which is the actor's own feed).
     * Mirrors the pattern used for leads/clients — a fire-and-forget insert
     * alongside the mutation, not part of its transaction.
     */
    private logUserActivity(params: {
        companyId: string;
        actorId: string;
        targetUserId: string;
        action: ActivityAction;
        type: ActivityType;
        title: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        return this.prisma.activity.create({
            data: {
                companyId: params.companyId,
                userId: params.actorId,
                targetUserId: params.targetUserId,
                action: params.action,
                type: params.type,
                title: params.title,
                metadata: params.metadata,
            },
        });
    }

    async findAll(user: AuthUser, query: QueryUsersDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            companyId: user.companyId,
            deletedAt: null,
            isActive: query.isActive ?? true,
            // Without this a COMPANY_ADMIN could enumerate a SUPER_ADMIN
            // account (a data anomaly — SUPER_ADMIN never has a companyId —
            // but worth guarding explicitly rather than trusting that).
            isSuperAdmin: user.isSuperAdmin ? undefined : false,
        };

        if (query.roleId) {
            where.roleId = query.roleId;
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
                orderBy: resolveOrderBy<Prisma.UserOrderByWithRelationInput>(
                    query.sortBy,
                    query.sortOrder,
                    USER_SORTABLE_FIELDS,
                    { fullName: "asc" },
                ),
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    roleId: true,
                    role: {select: {id: true, name: true, isBranchScoped: true}},
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

        if (!target || !canActorSeeUser(user, target)) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    async create(user: AuthUser, dto: CreateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const role = await this.ensureCanAssignRole(user, dto.roleId);

        await this.ensureEmailIsUnique(dto.email);

        await this.ensureBranchAssignmentValid(user.companyId, role, dto.branchId);

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const created = await this.prisma.user.create({
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                roleId: dto.roleId,
                companyId: user.companyId,
                branchId: dto.branchId,
            },
            select: USER_SAFE_SELECT,
        });

        await this.logUserActivity({
            companyId: user.companyId,
            actorId: user.id,
            targetUserId: created.id,
            action: ActivityAction.CREATED_USER,
            type: ActivityType.USER_CREATED,
            title: `User "${created.fullName}" created`,
            metadata: { roleId: created.roleId, branchId: created.branchId },
        });

        return created;
    }

    async update(user: AuthUser, id: string, dto: UpdateUserDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.getManageableTargetOrThrow(user, id);

        if (dto.roleId !== undefined) {
            await this.ensureCanAssignRole(user, dto.roleId);
        }

        if (dto.email && dto.email !== target.email) {
            await this.ensureEmailIsUnique(dto.email, id);
        }

        if (dto.isActive === false && target.id === user.id) {
            throw new BadRequestException("You cannot deactivate your own account");
        }

        if (dto.roleId !== undefined || dto.branchId !== undefined) {
            const effectiveRoleId = dto.roleId ?? target.roleId;
            const effectiveBranchId = dto.branchId !== undefined ? dto.branchId : target.branchId;
            const effectiveRole = await this.prisma.role.findUniqueOrThrow({
                where: { id: effectiveRoleId },
                select: { isBranchScoped: true },
            });
            await this.ensureBranchAssignmentValid(user.companyId, effectiveRole, effectiveBranchId);
        }

        const roleChanged = dto.roleId !== undefined && dto.roleId !== target.roleId;
        const beingDeactivated = dto.isActive === false && target.isActive === true;
        const beingReactivated = dto.isActive === true && target.isActive === false;
        const changes = diffChangedFields(dto, target, ["fullName", "email", "phone"]);

        const updated = await this.prisma.user.update({
            where: { id },
            data: {
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                roleId: dto.roleId,
                branchId: dto.branchId,
                isActive: dto.isActive,
                ...(roleChanged || beingDeactivated ? { sessionsValidFrom: new Date() } : {}),
            },
            select: USER_SAFE_SELECT,
        });

        const activityParams = {
            companyId: user.companyId,
            actorId: user.id,
            targetUserId: id,
        };

        if (roleChanged) {
            await this.logUserActivity({
                ...activityParams,
                action: ActivityAction.ROLE_CHANGED,
                type: ActivityType.USER_ROLE_CHANGED,
                title: `Role changed for "${updated.fullName}"`,
                metadata: { fromRoleId: target.roleId, toRoleId: updated.roleId },
            });
        }

        if (beingDeactivated) {
            await this.logUserActivity({
                ...activityParams,
                action: ActivityAction.DEACTIVATED_USER,
                type: ActivityType.USER_DEACTIVATED,
                title: `User "${updated.fullName}" deactivated`,
            });
        }

        if (changes || beingReactivated) {
            await this.logUserActivity({
                ...activityParams,
                action: ActivityAction.UPDATED_USER,
                type: ActivityType.USER_UPDATED,
                title: `User "${updated.fullName}" updated`,
                metadata: changes,
            });
        }

        return updated;
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

        if (!target.role.isBranchScoped) {
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

        await this.logUserActivity({
            companyId,
            actorId: user.id,
            targetUserId: id,
            action: ActivityAction.BRANCH_TRANSFERRED,
            type: ActivityType.USER_BRANCH_TRANSFERRED,
            title: `User "${target.fullName}" moved to another branch`,
            metadata: { fromBranchId: target.branchId, toBranchId: dto.branchId, reassignToId },
        });

        return { success: true };
    }

    async updatePassword(user: AuthUser, id: string, dto: UpdateUserPasswordDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.getManageableTargetOrThrow(user, id);

        const passwordHash = await bcrypt.hash(dto.password, 10);

        await this.prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                sessionsValidFrom: new Date()
            },
        });

        await this.logUserActivity({
            companyId: user.companyId,
            actorId: user.id,
            targetUserId: id,
            action: ActivityAction.RESET_PASSWORD,
            type: ActivityType.USER_PASSWORD_RESET,
            title: `Password reset for "${target.fullName}"`,
        });

        return { success: true };
    }

    async revokeSessions(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const target = await this.getManageableTargetOrThrow(user, id);

        await this.prisma.user.update({
            where: { id },
            data: { sessionsValidFrom: new Date() },
        });

        await this.logUserActivity({
            companyId: user.companyId,
            actorId: user.id,
            targetUserId: id,
            action: ActivityAction.REVOKED_SESSIONS,
            type: ActivityType.USER_SESSIONS_REVOKED,
            title: `Sessions revoked for "${target.fullName}"`,
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

        const target = await this.getManageableTargetOrThrow(user, id);

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

        await this.logUserActivity({
            companyId,
            actorId: user.id,
            targetUserId: id,
            action: ActivityAction.DEACTIVATED_USER,
            type: ActivityType.USER_DEACTIVATED,
            title: `User "${target.fullName}" deactivated`,
            metadata: { reassignToId },
        });

        return { success: true };
    }

    // --------------------------------------------------------------------
    // Used internally by AuthModule — unchanged signatures
    // --------------------------------------------------------------------

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { company: true, branch: true, role: true },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { company: true, branch: true, role: true },
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
     * the actor's company, must not already be soft-deleted, and must not be
     * a SUPER_ADMIN the actor cannot see. Without the last one a
     * COMPANY_ADMIN could reset a SUPER_ADMIN's password or delete the
     * account outright.
     *
     * Returns 404 rather than 403 for a target the actor may not see,
     * matching findOne() — a company admin should not be able to discover
     * that a SUPER_ADMIN exists by probing ids.
     */
    private async getManageableTargetOrThrow(actor: AuthUser, id: string) {
        const target = await this.prisma.user.findFirst({
            where: { id, companyId: actor.companyId, deletedAt: null },
            select: USER_SAFE_SELECT,
        });

        if (!target || !canActorSeeUser(actor, target)) {
            throw new NotFoundException("User not found");
        }

        return target;
    }

    /**
     * A Role can only be assigned if it's visible to the actor (a global
     * role, or one of their own company's custom roles), and the platform
     * role (isPlatformRole — the "Super Admin" role) can never be assigned
     * here at all — reserved for `prisma/seed.ts --mode provision-super-admin`,
     * since a user created through this (company-scoped) flow always gets a
     * companyId, and the platform role never has one.
     */
    private async ensureCanAssignRole(actor: AuthUser, roleId: string) {
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });

        if (!role) {
            throw new BadRequestException("Role not found");
        }

        if (role.isPlatformRole) {
            throw new ForbiddenException("You cannot assign this role");
        }

        const visible = role.companyId === null || role.companyId === actor.companyId;
        if (!visible) {
            throw new ForbiddenException("You cannot assign this role");
        }

        return role;
    }

    /**
     * A branch-scoped role's user must have a branch; a company-wide role's
     * user must not — an unscoped account is not a valid state to save for
     * either.
     */
    private async ensureBranchAssignmentValid(
        companyId: string | null,
        role: { isBranchScoped: boolean },
        branchId?: string | null,
    ) {
        if (!companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (role.isBranchScoped) {
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

        const companyId = user.companyId;

        const [counts, roles] = await Promise.all([
            this.prisma.user.groupBy({
                by: ["roleId"],
                where: {
                    companyId,
                    isSuperAdmin: user.isSuperAdmin ? undefined : false,
                    deletedAt: null,
                },
                _count: { _all: true },
            }),
            this.prisma.role.findMany({
                where: { OR: [{ companyId: null }, { companyId }] },
                select: { id: true, name: true },
            }),
        ]);

        const countByRoleId = new Map(counts.map((c) => [c.roleId, c._count._all]));
        const rolesWithMembers = roles.filter((r) => (countByRoleId.get(r.id) ?? 0) > 0);

        const samples = await Promise.all(
            rolesWithMembers.map((role) =>
                this.prisma.user.findMany({
                    where: { companyId, roleId: role.id, deletedAt: null },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                    select: { id: true, fullName: true },
                }),
            ),
        );

        return rolesWithMembers.map((role, index) => ({
            roleId: role.id,
            roleName: role.name,
            count: countByRoleId.get(role.id) ?? 0,
            sample: samples[index],
        }));
    }
}
