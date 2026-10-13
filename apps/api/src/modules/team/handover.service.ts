import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {NotificationType, Prisma, TaskStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {hasPermission} from "@/common/utils/permissions.util";
import {OPEN_LEAD_STATUSES} from "@/modules/leads/lead.constants";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {LeadsService} from "@/modules/leads/leads.service";
import {DealsService} from "@/modules/deals/services/deals.service";
import {TasksService} from "@/modules/tasks/tasks.service";
import {NotificationsService} from "@/modules/notifications/notifications.service";

/**
 * SH-5: when a manager is away or leaves, a Sales Head hands their open
 * work to someone else in one go: open leads, active deals (with the tasks
 * on them) and their tasks tied to neither. Each record goes through the
 * same reassignment as a one-off move, so the rules, the trail and the
 * task handover are identical; only the notification is one summary.
 */
@Injectable()
export class HandoverService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly leads: LeadsService,
        private readonly deals: DealsService,
        private readonly tasks: TasksService,
        private readonly notifications: NotificationsService,
    ) {}

    /** What a handover of `fromUserId` would move, before it's confirmed. */
    async preview(user: AuthUser, fromUserId: string) {
        const {companyId, from} = await this.load(user, fromUserId);
        const work = await this.findWork(companyId, from, user);
        return {
            user: {id: from.id, fullName: from.fullName, branchId: from.branchId},
            leads: work.leadIds.length,
            deals: work.dealIds.length,
            tasks: work.taskCount,
        };
    }

    async handOver(user: AuthUser, fromUserId: string, toUserId: string) {
        if (fromUserId === toUserId) {
            throw new BadRequestException("Choose someone else to take the work over.");
        }
        const {companyId, from} = await this.load(user, fromUserId);
        const work = await this.findWork(companyId, from, user);

        const leads = work.leadIds.length > 0
            ? await this.leads.bulkReassign(user, work.leadIds, toUserId, {notify: false})
            : {leads: 0, tasks: 0};
        const deals = work.dealIds.length > 0
            ? await this.deals.bulkReassign(user, work.dealIds, toUserId, {notify: false})
            : {deals: 0, tasks: 0};
        const standalone = await this.prisma.$transaction((db) => this.tasks.handOverOpenTasks(db, {
            companyId,
            actorId: user.id,
            link: {standalone: true},
            fromUserId: from.id,
            toUserId,
        }));

        const result = {
            leads: leads.leads,
            deals: deals.deals,
            tasks: leads.tasks + deals.tasks + standalone.length,
        };

        if (toUserId !== user.id && (result.leads || result.deals || result.tasks)) {
            await this.notifications.create({
                companyId,
                userId: toUserId,
                type: NotificationType.LEAD_REASSIGNED,
                title: `${user.name} handed ${from.fullName}'s work to you: ${result.leads} lead(s), ${result.deals} deal(s), ${result.tasks} task(s)`,
                templateKey: "workHandedOver",
                params: {fromName: from.fullName, byName: user.name, ...result},
            });
        }

        return result;
    }

    private async load(user: AuthUser, fromUserId: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        // Moving deals and leads both: the handover needs the two
        // permissions a one-off reassignment of each needs.
        if (!hasPermission(user, "deals.reassign") || !hasPermission(user, "leads.assign")) {
            throw new ForbiddenException("Handing work over needs permission to reassign both leads and deals.");
        }
        const from = await this.prisma.user.findFirst({
            where: {
                id: fromUserId,
                companyId: user.companyId,
                deletedAt: null,
                ...(user.isBranchScoped ? {branchId: user.branchId} : {}),
            },
            select: {id: true, fullName: true, branchId: true},
        });
        if (!from) throw new NotFoundException("User not found");
        return {companyId: user.companyId, from};
    }

    private async findWork(companyId: string, from: {id: string; branchId: string | null}, user: AuthUser) {
        const branch = user.isBranchScoped ? {branchId: user.branchId} : {};
        const [leads, deals] = await Promise.all([
            this.prisma.lead.findMany({
                where: {companyId, ...branch, managerId: from.id, deletedAt: null, status: {in: OPEN_LEAD_STATUSES}},
                select: {id: true},
            }),
            this.prisma.deal.findMany({
                where: {companyId, ...branch, managerId: from.id, deletedAt: null, status: {in: ACTIVE_DEAL_STATUSES}},
                select: {id: true},
            }),
        ]);
        const leadIds = leads.map((l) => l.id);
        const dealIds = deals.map((d) => d.id);

        // The tasks that will move: those on the leads and deals above
        // (handed over with them) and the ones tied to neither.
        const taskWhere: Prisma.TaskWhereInput = {
            companyId,
            assignedToId: from.id,
            deletedAt: null,
            status: {in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]},
            OR: [
                {leadId: null, dealId: null},
                ...(leadIds.length ? [{leadId: {in: leadIds}}] : []),
                ...(dealIds.length ? [{dealId: {in: dealIds}}] : []),
            ],
        };
        const taskCount = await this.prisma.task.count({where: taskWhere});

        return {leadIds, dealIds, taskCount};
    }
}
