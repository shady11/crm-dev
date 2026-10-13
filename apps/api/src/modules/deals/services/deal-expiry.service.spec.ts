import {DealStatus, NotificationType, UnitStatus} from '@/generated/prisma/client';
import {DealExpiryService} from './deal-expiry.service';

/**
 * The reservation-expiry cron is the one process that unilaterally changes
 * deal/unit state with no human in the loop, on every tenant at once. These
 * tests pin down the two properties that matter most for a background job
 * like this: it only ever touches rows that are still actually RESERVED
 * (the updateMany race guard), and a deal that lost the race is skipped
 * entirely rather than double-notified or double-logged.
 */
describe('DealExpiryService.expireOverdueReservations', () => {
    function candidate(overrides: Record<string, unknown> = {}) {
        return {
            id: 'deal-1',
            dealNumber: '2026-0001',
            unitId: 'unit-1',
            managerId: 'manager-1',
            companyId: 'company-1',
            clientId: 'client-1',
            ...overrides,
        };
    }

    function build(candidates: ReturnType<typeof candidate>[], flippedCount = 1) {
        const prisma = {
            deal: {
                findMany: jest.fn().mockResolvedValue(candidates),
                updateMany: jest.fn().mockResolvedValue({count: flippedCount}),
            },
            unit: {
                updateMany: jest.fn().mockResolvedValue({count: 1}),
            },
            activity: {
                create: jest.fn().mockResolvedValue({id: 'activity-1'}),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        const notifications = {create: jest.fn().mockResolvedValue({}), resolveForEntity: jest.fn().mockResolvedValue(0)};
        const activityService = {expireReservation: jest.fn().mockResolvedValue({})};

        const moneyHeld = {notifyIfHeld: jest.fn().mockResolvedValue(undefined)};

        const tasksService = {cancelOpenTasksForDeal: jest.fn().mockResolvedValue(0)};

        const service = new DealExpiryService(prisma as any, notifications as any, activityService as any, moneyHeld as any, tasksService as any);
        return {service, prisma, notifications, activityService, moneyHeld, tasksService};
    }

    it('does nothing when there are no overdue reservations', async () => {
        const {service, prisma} = build([]);
        await service.expireOverdueReservations();
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('only queries RESERVED deals with a past reservationExpiresAt', async () => {
        const {service, prisma} = build([]);
        await service.expireOverdueReservations();

        expect(prisma.deal.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {status: DealStatus.RESERVED, reservationExpiresAt: {lt: expect.any(Date)}},
            }),
        );
    });

    it('flips the deal to EXPIRED and releases the unit back to AVAILABLE', async () => {
        const {service, prisma} = build([candidate()]);
        await service.expireOverdueReservations();

        expect(prisma.deal.updateMany).toHaveBeenCalledWith({
            where: {id: 'deal-1', status: DealStatus.RESERVED},
            data: {status: DealStatus.EXPIRED},
        });
        expect(prisma.unit.updateMany).toHaveBeenCalledWith({
            where: {id: 'unit-1', status: UnitStatus.RESERVED},
            data: {status: UnitStatus.AVAILABLE},
        });
    });

    it('cancels the expired deal\'s open tasks, logged as its manager (SH-3)', async () => {
        const {service, prisma, tasksService, activityService} = build([candidate()]);
        tasksService.cancelOpenTasksForDeal.mockResolvedValue(1);
        await service.expireOverdueReservations();

        expect(tasksService.cancelOpenTasksForDeal).toHaveBeenCalledWith(prisma, {companyId: 'company-1', dealId: 'deal-1', actorId: 'manager-1'});
        expect(activityService.expireReservation).toHaveBeenCalledWith(expect.objectContaining({
            metadata: {reason: 'reservation_expiry_cron', tasksCancelled: 1},
        }));
    });

    it('leaves tasks alone on a deal that lost the race', async () => {
        const {service, tasksService} = build([candidate()], 0);
        await service.expireOverdueReservations();
        expect(tasksService.cancelOpenTasksForDeal).not.toHaveBeenCalled();
    });

    it('asks Finance to refund whatever the expired reservation still holds', async () => {
        const {service, moneyHeld} = build([candidate()]);
        await service.expireOverdueReservations();

        expect(moneyHeld.notifyIfHeld).toHaveBeenCalledWith(expect.objectContaining({id: 'deal-1'}));
    });

    it('notifies the deal manager once the reservation is expired', async () => {
        const {service, notifications} = build([candidate()]);
        await service.expireOverdueReservations();

        expect(notifications.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'manager-1',
                companyId: 'company-1',
                entityId: 'deal-1',
                type: NotificationType.DEAL_STATUS_CHANGED,
            }),
        );
    });

    it('records an activity entry for the expiry', async () => {
        const {service, activityService} = build([candidate()]);
        await service.expireOverdueReservations();

        expect(activityService.expireReservation).toHaveBeenCalledWith(
            expect.objectContaining({companyId: 'company-1', userId: 'manager-1', dealId: 'deal-1', clientId: 'client-1'}),
        );
    });

    it('skips notification and activity logging when the deal has no manager', async () => {
        const {service, notifications, activityService} = build([candidate({managerId: null})]);
        await service.expireOverdueReservations();

        expect(activityService.expireReservation).not.toHaveBeenCalled();
        expect(notifications.create).not.toHaveBeenCalled();
    });

    it('skips unit release and notification when another process already flipped the deal (race lost)', async () => {
        const {service, prisma, notifications, activityService} = build([candidate()], 0);
        await service.expireOverdueReservations();

        expect(prisma.unit.updateMany).not.toHaveBeenCalled();
        expect(activityService.expireReservation).not.toHaveBeenCalled();
        expect(notifications.create).not.toHaveBeenCalled();
    });

    it('processes each candidate deal independently, one transaction per deal', async () => {
        const {service, prisma} = build([candidate({id: 'deal-1', unitId: 'unit-1'}), candidate({id: 'deal-2', unitId: 'unit-2'})]);
        await service.expireOverdueReservations();

        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('withdraws a discount request still waiting on a reservation that lapsed', async () => {
        const {service, notifications} = build([candidate({discountApprovalStatus: 'PENDING', requestedDiscountPercent: 10})]);

        await service.expireOverdueReservations();

        expect(notifications.resolveForEntity).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'deal-1', templateKey: 'discountRequestWithdrawn', params: {dealNumber: '2026-0001', percent: 10},
        }));
    });

    it('leaves notifications alone for a lapsed reservation with no pending discount', async () => {
        const {service, notifications} = build([candidate({discountApprovalStatus: 'NONE'})]);

        await service.expireOverdueReservations();

        expect(notifications.resolveForEntity).not.toHaveBeenCalled();
    });
});
