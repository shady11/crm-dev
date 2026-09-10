import {ForbiddenException} from '@nestjs/common';
import {NotificationEntityType, NotificationType} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {NotificationsService} from './notifications.service';

/**
 * NotificationsService is a thin persistence layer over a realtime push —
 * every mutation that changes what's unread must push a fresh
 * "notification:unread-count" over the gateway to the affected user, and
 * every read is scoped to the caller's own company+userId so one user can
 * never see or mark another's notifications.
 */
describe('NotificationsService', () => {
    const user: AuthUser = {
        id: 'user-1',
        email: 'user@crm.dev',
        name: 'User',
        role: 'SALES_MANAGER' as any,
        companyId: 'company-1',
        company: null,
        branchId: 'branch-1',
        branch: null,
    };

    function build(opts: {unreadCount?: number} = {}) {
        const prisma = {
            notification: {
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'notif-1', isRead: false, ...data})),
                count: jest.fn().mockResolvedValue(opts.unreadCount ?? 0),
                findMany: jest.fn().mockResolvedValue([]),
                updateMany: jest.fn().mockResolvedValue({count: 1}),
            },
        };
        const gateway = {emitToUser: jest.fn()};

        const service = new NotificationsService(prisma as any, gateway as any);
        return {service, prisma, gateway};
    }

    const createParams = (overrides: Record<string, unknown> = {}) => ({
        companyId: 'company-1',
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'New task assigned to you',
        ...overrides,
    });

    describe('create', () => {
        it('persists the notification with exactly the given params', async () => {
            const {service, prisma} = build();
            await service.create(createParams({message: 'hello', entityType: NotificationEntityType.TASK, entityId: 'task-1'}));

            expect(prisma.notification.create).toHaveBeenCalledWith({
                data: createParams({message: 'hello', entityType: NotificationEntityType.TASK, entityId: 'task-1'}),
            });
        });

        it('pushes both the new notification and a fresh unread count to the recipient', async () => {
            const {service, gateway} = build({unreadCount: 3});
            await service.create(createParams());

            expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:new', expect.objectContaining({id: 'notif-1'}));
            expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:unread-count', {count: 3});
        });

        it('recomputes the unread count scoped to the recipient after creating', async () => {
            const {service, prisma} = build();
            await service.create(createParams());

            expect(prisma.notification.count).toHaveBeenCalledWith({where: {userId: 'user-1', isRead: false}});
        });

        it('returns the created notification', async () => {
            const {service} = build();
            const result = await service.create(createParams());
            expect(result).toMatchObject({id: 'notif-1'});
        });
    });

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...user, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes the query to the caller own company and userId, never anyone else', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {});

            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {companyId: 'company-1', userId: 'user-1', isRead: undefined}}),
            );
        });

        it('filters by isRead when given', async () => {
            const {service, prisma} = build();
            await service.findAll(user, {isRead: true} as any);

            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({isRead: true})}),
            );
        });

        it('computes pagination meta from total and limit', async () => {
            const {service, prisma} = build();
            prisma.notification.count.mockResolvedValue(41);

            const result = await service.findAll(user, {page: 1, limit: 20} as any);

            expect(result.meta).toEqual({page: 1, limit: 20, total: 41, pages: 3});
        });
    });

    describe('getUnreadCount', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.getUnreadCount({...user, companyId: null})).rejects.toThrow(ForbiddenException);
        });

        it('scopes the count to the caller company and userId', async () => {
            const {service, prisma} = build({unreadCount: 7});
            const result = await service.getUnreadCount(user);

            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: {companyId: 'company-1', userId: 'user-1', isRead: false},
            });
            expect(result).toEqual({count: 7});
        });
    });

    describe('markAsRead', () => {
        it('scopes the update to the notification id AND the caller userId, never another user\'s notification', async () => {
            const {service, prisma} = build();
            await service.markAsRead(user, 'notif-1');

            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: {id: 'notif-1', userId: 'user-1'},
                data: {isRead: true, readAt: expect.any(Date)},
            });
        });

        it('pushes the recomputed unread count to the caller after marking read', async () => {
            const {service, gateway} = build({unreadCount: 2});
            await service.markAsRead(user, 'notif-1');

            expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:unread-count', {count: 2});
        });
    });

    describe('markAllAsRead', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.markAllAsRead({...user, companyId: null})).rejects.toThrow(ForbiddenException);
        });

        it('marks only the caller own unread notifications as read', async () => {
            const {service, prisma} = build();
            await service.markAllAsRead(user);

            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: {companyId: 'company-1', userId: 'user-1', isRead: false},
                data: {isRead: true, readAt: expect.any(Date)},
            });
        });

        it('pushes an unread count of zero without re-querying the database', async () => {
            const {service, gateway, prisma} = build();
            await service.markAllAsRead(user);

            expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:unread-count', {count: 0});
            expect(prisma.notification.count).not.toHaveBeenCalled();
        });
    });
});
