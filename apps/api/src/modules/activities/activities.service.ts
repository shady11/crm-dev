import {ForbiddenException, Injectable} from "@nestjs/common";
import {Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ActivitySubject, QueryActivitiesDto} from "./dto/query-activities.dto";

/**
 * Company-wide activity feed. COMPANY_ADMIN sees every activity raised by
 * anyone in the company; SALES_HEAD/SALES_MANAGER (branch-scoped roles) see
 * only activity raised by users in their own branch.
 *
 * Activity itself carries no branchId (unlike Lead/Client/Deal/Task) — it is
 * sometimes raised with no lead/client/deal attached at all — so branch
 * scoping filters through the acting user's branch rather than a column on
 * Activity. This also means a transferred user's historical activity moves
 * with them to their new branch, rather than staying pinned to the branch
 * they were in when the row was written.
 */
// What each row is about, so the log can say "Deal D-2026-0027 · Ermek
// Kydyrov" rather than a bare "Unit reserved".
const ACTIVITY_INCLUDE = {
    user: {select: {id: true, fullName: true, branchId: true}},
    lead: {select: {id: true, fullName: true}},
    client: {select: {id: true, fullName: true}},
    // Some deal rows (e.g. payments) don't carry clientId; the deal's client fills in.
    deal: {select: {id: true, dealNumber: true, client: {select: {id: true, fullName: true}}}},
    task: {select: {id: true, title: true}},
    unit: {select: {id: true, number: true, project: {select: {id: true, name: true}}}},
    project: {select: {id: true, name: true}},
} satisfies Prisma.ActivityInclude;

// "Related to" filter: rows linked to that kind of record.
const SUBJECT_FILTERS: Record<ActivitySubject, Prisma.ActivityWhereInput> = {
    lead: {leadId: {not: null}},
    client: {clientId: {not: null}, dealId: null},
    deal: {dealId: {not: null}},
    task: {taskId: {not: null}},
    inventory: {OR: [{unitId: {not: null}}, {projectId: {not: null}}, {blockId: {not: null}}, {entranceId: {not: null}}, {floorId: {not: null}}]},
};

@Injectable()
export class ActivitiesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(user: AuthUser, query: QueryActivitiesDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ActivityWhereInput = {
            companyId: user.companyId,
        };

        if (user.isBranchScoped) {
            where.user = {branchId: user.branchId};
        } else if (query.branchId) {
            where.user = {branchId: query.branchId};
        }

        if (query.userId) where.userId = query.userId;
        if (query.type) where.type = query.type;
        if (query.action) where.action = query.action;
        if (query.leadId) where.leadId = query.leadId;
        if (query.clientId) where.clientId = query.clientId;
        if (query.dealId) where.dealId = query.dealId;
        if (query.subject) where.AND = [SUBJECT_FILTERS[query.subject]];

        if (query.dateFrom || query.dateTo) {
            where.createdAt = {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.activity.findMany({
                where,
                skip,
                take: limit,
                orderBy: {createdAt: "desc"},
                include: ACTIVITY_INCLUDE,
            }),
            this.prisma.activity.count({where}),
        ]);

        return {
            items,
            meta: {page, limit, total, pages: Math.ceil(total / limit)},
        };
    }
}
