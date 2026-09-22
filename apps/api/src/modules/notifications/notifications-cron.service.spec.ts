import {NotificationEntityType, NotificationType, TaskStatus} from '@/generated/prisma/client';
import {NotificationsCronService} from './notifications-cron.service';

/**
 * This cron runs every hour — its single most important property is
 * notifyOnce()'s dedup check: without it, a manager would get pinged again
 * on every hourly run for the same expiring reservation or due task until
 * the underlying condition resolves.
 */
describe('NotificationsCronService', () => {
    function build(opts: {
        deals?: unknown[];
        dueSoonTasks?: unknown[];
        overdueTasks?: unknown[];
        severelyOverdueTasks?: unknown[];
        teamLeads?: unknown[];
        existingNotification?: unknown;
    } = {}) {
        const prisma = {
            deal: {findMany: jest.fn().mockResolvedValue(opts.deals ?? [])},
            task: {
                findMany: jest.fn()
                    .mockResolvedValueOnce(opts.dueSoonTasks ?? [])
                    .mockResolvedValueOnce(opts.overdueTasks ?? [])
                    .mockResolvedValueOnce(opts.severelyOverdueTasks ?? []),
            },
            user: {findMany: jest.fn().mockResolvedValue(opts.teamLeads ?? [])},
            notification: {findFirst: jest.fn().mockResolvedValue(opts.existingNotification ?? null)},
        };
        const notifications = {create: jest.fn().mockResolvedValue({})};
        const rbacService = {findRoleIdsWithPermission: jest.fn().mockResolvedValue(['role-sales-head'])};

        const service = new NotificationsCronService(prisma as any, notifications as any, rbacService as any);
        return {service, prisma, notifications, rbacService};
    }

    describe('checkExpiringReservations', () => {
        it('only queries RESERVED deals expiring within 24h with a manager assigned', async () => {
            const {service, prisma} = build();
            await service.checkExpiringReservations();

            expect(prisma.deal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        status: 'RESERVED',
                        reservationExpiresAt: {lte: expect.any(Date), gte: expect.any(Date)},
                        managerId: {not: null},
                    },
                }),
            );
        });

        it('notifies the manager of each expiring deal', async () => {
            const {service, notifications} = build({
                deals: [{id: 'deal-1', dealNumber: '2026-0001', managerId: 'manager-1', companyId: 'company-1', reservationExpiresAt: new Date()}],
            });

            await service.checkExpiringReservations();

            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'manager-1', type: NotificationType.RESERVATION_EXPIRING, entityId: 'deal-1'}),
            );
        });

        it('skips a deal already notified about within the last 24h', async () => {
            const {service, notifications} = build({
                deals: [{id: 'deal-1', dealNumber: '2026-0001', managerId: 'manager-1', companyId: 'company-1', reservationExpiresAt: new Date()}],
                existingNotification: {id: 'notif-existing'},
            });

            await service.checkExpiringReservations();

            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('checks for a duplicate scoped to the same user/type/entity within the last 24h', async () => {
            const {service, prisma} = build({
                deals: [{id: 'deal-1', dealNumber: '2026-0001', managerId: 'manager-1', companyId: 'company-1', reservationExpiresAt: new Date()}],
            });

            await service.checkExpiringReservations();

            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where: {
                    userId: 'manager-1',
                    type: NotificationType.RESERVATION_EXPIRING,
                    entityType: NotificationEntityType.DEAL,
                    entityId: 'deal-1',
                    createdAt: {gte: expect.any(Date)},
                },
            });
        });
    });

    describe('checkTaskDeadlines', () => {
        it('queries due-soon tasks as TODO/IN_PROGRESS with a dueDate within the next 24h', async () => {
            const {service, prisma} = build();
            await service.checkTaskDeadlines();

            expect(prisma.task.findMany).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    where: {
                        status: {in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]},
                        dueDate: {gte: expect.any(Date), lte: expect.any(Date)},
                        deletedAt: null,
                    },
                }),
            );
        });

        it('queries overdue tasks separately, by a dueDate strictly in the past', async () => {
            const {service, prisma} = build();
            await service.checkTaskDeadlines();

            expect(prisma.task.findMany).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({where: expect.objectContaining({dueDate: {lt: expect.any(Date)}})}),
            );
        });

        it('notifies the assignee for both due-soon and overdue tasks with distinct notification types', async () => {
            const {service, notifications} = build({
                dueSoonTasks: [{id: 'task-1', title: 'Follow up', assignedToId: 'user-1', companyId: 'company-1'}],
                overdueTasks: [{id: 'task-2', title: 'Call client', assignedToId: 'user-2', companyId: 'company-1'}],
            });

            await service.checkTaskDeadlines();

            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'user-1', type: NotificationType.TASK_DUE_SOON, entityId: 'task-1'}),
            );
            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'user-2', type: NotificationType.TASK_OVERDUE, entityId: 'task-2'}),
            );
        });

        it('skips a task already notified about within the last 24h', async () => {
            const {service, notifications} = build({
                dueSoonTasks: [{id: 'task-1', title: 'Follow up', assignedToId: 'user-1', companyId: 'company-1'}],
                existingNotification: {id: 'notif-existing'},
            });

            await service.checkTaskDeadlines();

            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('queries tasks overdue 3+ days, excluding branchless tasks, for escalation', async () => {
            const {service, prisma} = build();
            await service.checkTaskDeadlines();

            expect(prisma.task.findMany).toHaveBeenNthCalledWith(
                3,
                expect.objectContaining({
                    where: {
                        status: {in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]},
                        dueDate: {lte: expect.any(Date)},
                        deletedAt: null,
                        branchId: {not: null},
                    },
                }),
            );
        });

        it('escalates a severely overdue task to its branch team lead(s), not the assignee', async () => {
            const {service, prisma, notifications, rbacService} = build({
                severelyOverdueTasks: [{id: 'task-3', title: 'Stale task', companyId: 'company-1', branchId: 'branch-1'}],
                teamLeads: [{id: 'head-1'}, {id: 'head-2'}],
            });

            await service.checkTaskDeadlines();

            expect(rbacService.findRoleIdsWithPermission).toHaveBeenCalledWith('company-1', 'deals.reassign');
            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-1', roleId: {in: ['role-sales-head']}})}),
            );
            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'head-1', type: NotificationType.TASK_ESCALATED, entityId: 'task-3'}),
            );
            expect(notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({userId: 'head-2', type: NotificationType.TASK_ESCALATED, entityId: 'task-3'}),
            );
        });

        it('does not escalate when no severely overdue tasks exist', async () => {
            const {service, notifications} = build();
            await service.checkTaskDeadlines();

            expect(notifications.create).not.toHaveBeenCalled();
        });
    });
});
