import {ActivityAction, ActivityType} from '@/generated/prisma/client';
import {DealActivityService} from './deal-activity.service';

/**
 * Every deal-mutating path (reserve, cancel, sign, pay, discount decide...)
 * logs through one of these named helpers rather than calling create()
 * directly. The one thing worth pinning down per helper is that it maps to
 * the *correct* (action, type, title) triple — a copy-paste mistake here
 * would silently mislabel an entry in every deal's activity timeline.
 */
describe('DealActivityService', () => {
    function build() {
        const db = {activity: {create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'activity-1', ...data}))}};
        const service = new DealActivityService();
        return {service, db};
    }

    const baseParams = (db: unknown) => ({
        db: db as any,
        companyId: 'company-1',
        userId: 'user-1',
        dealId: 'deal-1',
        clientId: 'client-1',
    });

    it('create() writes every given field through to the activity row, including optional description/metadata', async () => {
        const {service, db} = build();
        await service.create({
            ...baseParams(db),
            action: ActivityAction.UPDATED,
            type: ActivityType.DEAL_UPDATED,
            title: 'Custom title',
            description: 'Custom description',
            metadata: {foo: 'bar'},
        });

        expect(db.activity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                companyId: 'company-1',
                userId: 'user-1',
                dealId: 'deal-1',
                clientId: 'client-1',
                action: ActivityAction.UPDATED,
                type: ActivityType.DEAL_UPDATED,
                title: 'Custom title',
                description: 'Custom description',
                metadata: {foo: 'bar'},
            }),
        });
    });

    it.each([
        ['reserve', ActivityAction.RESERVED_UNIT, ActivityType.UNIT_RESERVED, 'Unit reserved'],
        ['extendReservation', ActivityAction.UPDATED, ActivityType.RESERVATION_EXTENDED, 'Reservation extended'],
        ['cancelReservation', ActivityAction.CANCELLED_RESERVATION, ActivityType.RESERVATION_CANCELLED, 'Reservation cancelled'],
        ['expireReservation', ActivityAction.CHANGED_DEAL_STATUS, ActivityType.RESERVATION_EXPIRED, 'Reservation expired'],
        ['signContract', ActivityAction.GENERATED_CONTRACT, ActivityType.CONTRACT_SIGNED, 'Contract signed'],
        ['paymentReceived', ActivityAction.RECEIVED_PAYMENT, ActivityType.PAYMENT_RECEIVED, 'Payment received'],
        ['paymentRefunded', ActivityAction.RECEIVED_PAYMENT, ActivityType.PAYMENT_REFUNDED, 'Refund issued'],
        ['dealUpdated', ActivityAction.UPDATED_DEAL, ActivityType.DEAL_UPDATED, 'Deal updated'],
        ['reassignManager', ActivityAction.REASSIGNED, ActivityType.DEAL_REASSIGNED, 'Deal reassigned to another manager'],
        ['discountRequested', ActivityAction.DISCOUNT_REQUESTED, ActivityType.DISCOUNT_REQUESTED, 'Discount requested approval'],
        ['discountApproved', ActivityAction.DISCOUNT_APPROVED, ActivityType.DISCOUNT_APPROVED, 'Discount approved'],
        ['discountRejected', ActivityAction.DISCOUNT_REJECTED, ActivityType.DISCOUNT_REJECTED, 'Discount rejected'],
    ] as const)('%s() logs action=%s type=%s title=%p', async (method, action, type, title) => {
        const {service, db} = build();
        await (service[method] as (p: unknown) => Promise<unknown>)(baseParams(db));

        expect(db.activity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({action, type, title}),
        });
    });

    it('documentGenerated() logs a fixed action/type but uses the caller-supplied title', async () => {
        const {service, db} = build();
        await service.documentGenerated(baseParams(db), 'Reservation agreement generated');

        expect(db.activity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: ActivityAction.GENERATED_DOCUMENT,
                type: ActivityType.DOCUMENT_GENERATED,
                title: 'Reservation agreement generated',
            }),
        });
    });

    it('every named helper writes through the given db (transaction) client, not some other one', async () => {
        const {service, db} = build();
        const otherDb = {activity: {create: jest.fn().mockResolvedValue({})}};

        await service.reserve(baseParams(db));

        expect(db.activity.create).toHaveBeenCalled();
        expect(otherDb.activity.create).not.toHaveBeenCalled();
    });
});
