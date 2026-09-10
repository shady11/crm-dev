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
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        const notifications = {create: jest.fn().mockResolvedValue({})};
        const activityService = {expireReservation: jest.fn().mockResolvedValue({})};

        const service = new DealExpiryService(prisma as any, notifications as any, activityService as any);
        return {service, prisma, notifications, activityService};
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
});
