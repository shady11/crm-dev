import {BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {ActivityAction, ActivityType, Prisma, UserRole} from "@/generated/prisma/client";
import {LeadStatus} from "@/generated/prisma/enums";
import {PrismaService} from "@/database/prisma.service";
import {ClientsService} from "@/modules/clients/clients.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";
import {TransferBranchDto} from "@/common/dto/transfer-branch.dto";
import {ReassignManagerDto} from "@/common/dto/reassign-manager.dto";
import {QueryLeadsDto} from "@/modules/leads/dto/query-leads.dto";
import {CreateLeadDto} from "@/modules/leads/dto/create-lead.dto";
import {UpdateLeadDto} from "@/modules/leads/dto/update-lead.dto";
import {ConvertLeadDto} from "@/modules/leads/dto/convert-lead.dto";
import {ContactAttemptType, LogContactAttemptDto} from "@/modules/leads/dto/log-contact-attempt.dto";

const CONTACT_ATTEMPT_TYPE_MAP: Record<ContactAttemptType, ActivityType> = {
    CALL: ActivityType.CALL,
    MESSAGE: ActivityType.MESSAGE_SENT,
    MEETING: ActivityType.MEETING,
};

@Injectable()
export class LeadsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly clientsService: ClientsService,
    ) {}

    async findAll(user: AuthUser, query: QueryLeadsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.LeadWhereInput = {
            companyId: user.companyId,
        };

        // BR-B1: branch-scoped roles see only their own branch's leads.
        if (isBranchScopedRole(user.role)) {
            where.branchId = user.branchId;
        } else if (query.branchId) {
            // BR-B3: a company-wide role may narrow to one branch. Kept as a
            // separate branch from the one above — never merged with it — so
            // this admin-only filter can never be mistaken for the sales-role
            // restriction.
            where.branchId = query.branchId;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.source) {
            where.source = query.source;
        }

        if (query.managerId) {
            where.managerId = query.managerId;
        }

        if (query.search) {
            where.OR = [
                {
                    fullName: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    phone: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    email: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                        },
                    },
                },
            }),
            this.prisma.lead.count({
                where,
            }),
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

        const lead = await this.prisma.lead.findFirst({
            where: {
                id,
                companyId: user.companyId,
                // BR-B1: merged into the same lookup as the company check, so
                // a lead in another branch 404s exactly like a lead in
                // another company — never a separate 403 that would confirm
                // the record exists.
                ...(isBranchScopedRole(user.role) ? {branchId: user.branchId} : {}),
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });

        if (!lead) {
            throw new NotFoundException("Lead not found");
        }

        return lead;
    }

    async create(user: AuthUser, dto: CreateLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (dto.managerId) {
            await this.ensureManagerAssignable(dto.managerId, user);
        }

        if (dto.clientId) {
            await this.ensureClientAssignable(dto.clientId, user);
        }

        if (!dto.confirmDuplicate) {
            await this.rejectIfDuplicatePhone(user, dto.phone);
        }

        // BR-B2: stamped from the actor server-side, never trusted from the
        // request body — there is no branchId field on CreateLeadDto at all.
        // Company-wide roles leave it unassigned until a COMPANY_ADMIN hands
        // the lead to a branch (BR-D1).
        const branchId = isBranchScopedRole(user.role) ? user.branchId : null;

        return this.prisma.lead.create({
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                email: dto.email,
                source: dto.source,
                status: dto.status,
                comment: dto.comment,
                companyId: user.companyId,
                branchId,
                managerId: dto.managerId,
                clientId: dto.clientId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    async update(user: AuthUser, id: string, dto: UpdateLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        if (dto.managerId) {
            await this.ensureManagerAssignable(dto.managerId, user);
        }

        if (dto.clientId) {
            await this.ensureClientAssignable(dto.clientId, user);
        }

        return this.prisma.lead.update({
            where: {
                id,
            },
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
                email: dto.email,
                source: dto.source,
                status: dto.status,
                comment: dto.comment,
                managerId: dto.managerId,
                clientId: dto.clientId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Converts a lead into a client. Either links the lead to an existing
     * client (`dto.clientId`) or creates a brand-new client from the lead's
     * own contact details, then marks the lead as CONVERTED.
     */
    async convert(user: AuthUser, id: string, dto: ConvertLeadDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const lead = await this.findOne(user, id);

        if (lead.clientId) {
            throw new BadRequestException("Lead is already linked to a client");
        }

        let clientId: string;

        if (dto.clientId) {
            await this.ensureClientAssignable(dto.clientId, user);
            clientId = dto.clientId;
        } else {
            const client = await this.clientsService.create(user, {
                fullName: lead.fullName,
                phone: lead.phone,
                email: lead.email ?? undefined,
            });
            clientId = client.id;
        }

        return this.prisma.lead.update({
            where: {
                id,
            },
            data: {
                clientId,
                status: LeadStatus.CONVERTED,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    async checkDuplicates(user: AuthUser, phone: string, excludeLeadId?: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;
        const branchScoped = isBranchScopedRole(user.role);

        const [leads, clients] = await Promise.all([
            this.prisma.lead.findMany({
                where: {
                    companyId,
                    phone,
                    deletedAt: null,
                    id: excludeLeadId ? { not: excludeLeadId } : undefined,
                    ...(branchScoped ? { branchId: user.branchId } : {}),
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            this.prisma.client.findMany({
                where: {
                    companyId,
                    phone,
                    deletedAt: null,
                    ...(branchScoped ? { branchId: user.branchId } : {}),
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        // BR-D2: a COMPANY_ADMIN-only heads-up that this phone already exists
        // as a client at a *different* branch. Deliberately not derived from
        // `!branchScoped` — FINANCE has no reason to see this either, and
        // this must never share code with the BR-B1 restriction above.
        let crossBranchClient: { id: string; branchId: string | null } | null = null;

        if (user.role === UserRole.COMPANY_ADMIN) {
            crossBranchClient = await this.prisma.client.findFirst({
                where: { companyId, phone, deletedAt: null },
                select: { id: true, branchId: true },
            });
        }

        return { leads, clients, crossBranchClient };
    }

    /**
     * Hands a lead off to another branch (BR-D1). COMPANY_ADMIN only — branch
     * staff can't see across the boundary they'd be moving a lead out of, so
     * this can only ever originate from a company-wide role. No branch filter
     * on the lookup below for that reason: an admin may move any lead in
     * their company regardless of its current branch.
     */
    async transferBranch(user: AuthUser, id: string, dto: TransferBranchDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const lead = await this.prisma.lead.findFirst({ where: { id, companyId } });

        if (!lead) {
            throw new NotFoundException("Lead not found");
        }

        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId, deactivatedAt: null },
        });

        if (!branch) {
            throw new BadRequestException("Branch does not belong to your company or is deactivated");
        }

        const updated = await this.prisma.lead.update({
            where: { id },
            data: { branchId: dto.branchId },
        });

        await this.prisma.activity.create({
            data: {
                companyId,
                userId: user.id,
                leadId: id,
                action: ActivityAction.BRANCH_TRANSFERRED,
                type: ActivityType.LEAD_BRANCH_TRANSFERRED,
                title: "Lead moved to another branch",
                metadata: { fromBranchId: lead.branchId, toBranchId: dto.branchId },
            },
        });

        return updated;
    }

    /**
     * SH-A1: lets a SALES_HEAD move a lead from one of their team's
     * SALES_MANAGERs to another without going through COMPANY_ADMIN. Kept as
     * its own endpoint rather than folded into update() — a dedicated,
     * narrowly-scoped write action restricted to team leads, not the general
     * edit any SALES_MANAGER can already do to their own leads.
     */
    async reassignManager(user: AuthUser, id: string, dto: ReassignManagerDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        // findOne() already 404s a lead outside the actor's own branch for a
        // branch-scoped role (BR-B1) — the same boundary this write action
        // must respect, so no separate check is needed here.
        const lead = await this.findOne(user, id);

        await this.ensureReassignable(user, lead.branchId, dto.managerId);

        const updated = await this.prisma.lead.update({
            where: { id },
            data: { managerId: dto.managerId },
            include: {
                manager: {
                    select: { id: true, fullName: true, email: true },
                },
                client: {
                    select: { id: true, fullName: true, phone: true },
                },
            },
        });

        await this.prisma.activity.create({
            data: {
                companyId: user.companyId,
                userId: user.id,
                leadId: id,
                action: ActivityAction.REASSIGNED,
                type: ActivityType.LEAD_REASSIGNED,
                title: "Lead reassigned to another manager",
                metadata: { fromManagerId: lead.managerId, toManagerId: dto.managerId },
            },
        });

        return updated;
    }

    /**
     * SM-B1: records a contact attempt — a call, a message, or a meeting —
     * against a lead even when nothing rises to the level of a task. Before
     * this, the only record of interaction was the single freeform `comment`
     * field, so two months of a cold lead looked identical to one that was
     * called five times and never answered. Appends to the lead's Activity
     * timeline instead, which findOne()'s access check already scopes to the
     * caller's company/branch.
     */
    async logContactAttempt(user: AuthUser, id: string, dto: LogContactAttemptDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        return this.prisma.activity.create({
            data: {
                companyId: user.companyId,
                userId: user.id,
                leadId: id,
                action: ActivityAction.LOGGED_CONTACT_ATTEMPT,
                type: CONTACT_ATTEMPT_TYPE_MAP[dto.type],
                title: "Contact attempt logged",
                description: dto.note,
            },
            include: {
                user: {select: {id: true, fullName: true}},
            },
        });
    }

    /**
     * The other half of SM-B1: the timeline logContactAttempt() above appends
     * to. Access is enforced the same way — findOne() 404s a lead outside the
     * caller's company/branch before any activity is ever read.
     */
    async listActivities(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        return this.prisma.activity.findMany({
            where: {leadId: id},
            orderBy: {createdAt: "desc"},
            include: {
                user: {select: {id: true, fullName: true}},
            },
        });
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.findOne(user, id);

        await this.prisma.lead.delete({
            where: {
                id,
            },
        });

        return {
            success: true,
        };
    }

    /**
     * The single most common data-quality problem on a multi-agent sales
     * floor: the same walk-in or ad click gets entered as a second lead
     * because nobody checked first. Reuses checkDuplicates()'s lookup so the
     * warning shown by GET /leads/duplicates and the rule enforced here can
     * never drift apart. Callers who have already seen the warning and want
     * to proceed anyway pass dto.confirmDuplicate — this only blocks a
     * silent duplicate, never a deliberate one.
     */
    private async rejectIfDuplicatePhone(user: AuthUser, phone: string) {
        const { leads, clients } = await this.checkDuplicates(user, phone);

        if (leads.length > 0 || clients.length > 0) {
            throw new ConflictException({
                message: "A lead or client with this phone number already exists",
                duplicates: { leads, clients },
            });
        }
    }

    /**
     * A branch-scoped actor may only assign a manager within their own
     * branch — otherwise they could route a lead to someone on the other
     * side of the isolation boundary they're themselves confined to.
     */
    private async ensureManagerAssignable(managerId: string, user: AuthUser) {
        const manager = await this.prisma.user.findFirst({
            where: {
                id: managerId,
                companyId: user.companyId,
                isActive: true,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
        });

        if (!manager) {
            throw new BadRequestException("Manager not assignable");
        }
    }

    /**
     * SH-A1's target check: the new manager must be an active SALES_MANAGER
     * on the same branch as the lead itself, not just any assignable user —
     * a stricter check than ensureManagerAssignable's, since this is
     * specifically "move it to a different SALES_MANAGER on the team", not a
     * general-purpose manager field edit.
     */
    private async ensureReassignable(user: AuthUser, leadBranchId: string | null, managerId: string) {
        if (!leadBranchId) {
            throw new BadRequestException("Lead is not assigned to a branch");
        }

        const manager = await this.prisma.user.findFirst({
            where: {
                id: managerId,
                companyId: user.companyId,
                branchId: leadBranchId,
                role: UserRole.SALES_MANAGER,
                isActive: true,
            },
        });

        if (!manager) {
            throw new BadRequestException(
                "Manager not assignable — must be an active SALES_MANAGER on the same branch",
            );
        }
    }

    /**
     * Same reasoning as ensureManagerAssignable: a branch-scoped actor can
     * only link a lead to a client already visible to them. An unassigned or
     * other-branch client 404s implicitly here as "not assignable" — no
     * separate branch check, same as the read-side 404-not-403 pattern.
     */
    private async ensureClientAssignable(clientId: string, user: AuthUser) {
        const client = await this.prisma.client.findFirst({
            where: {
                id: clientId,
                companyId: user.companyId,
                ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
            },
        });

        if (!client) {
            throw new BadRequestException("Client not assignable");
        }
    }
}
