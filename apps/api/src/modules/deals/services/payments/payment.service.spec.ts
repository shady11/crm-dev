import {ForbiddenException} from '@nestjs/common';
import {DealStatus, PaymentMethod, PaymentScheduleStatus, PaymentType, Prisma, UserRole} from '@/generated/prisma/client';
import {PaymentService} from './payment.service';
import {DealDomainService} from '../deal-domain.service';
import {DealNotFoundException, PaymentExceedsBalanceException, RefundExceedsPaidException} from '../../exceptions';

/**
 * Recording a payment/refund is where real money changes state: it must
 * reject overpayment/over-refund (delegated to DealDomainService, used here
 * for real rather than mocked), apply forward payments against outstanding
 * installments oldest-first, and never let a refund silently rewrite the
 * schedule.
 */
describe('PaymentService.create', () => {
    const user = {
        id: 'user-1',
        role: UserRole.COMPANY_ADMIN,
        companyId: 'company-1',
        branchId: null,
    } as any;

    function schedule(overrides: Record<string, unknown> = {}) {
        return {
            id: 'sch-1',
            order: 1,
            amount: new Prisma.Decimal(300),
            paidAmount: new Prisma.Decimal(0),
            status: PaymentScheduleStatus.PENDING,
            ...overrides,
        };
    }

    function build(opts: {
        deal?: Record<string, unknown> | null;
        totalPaid?: number;
        schedules?: ReturnType<typeof schedule>[];
    }) {
        const deal = opts.deal === null ? null : {
            id: 'deal-1',
            dealNumber: '2026-0001',
            status: DealStatus.ACTIVE,
            salePrice: new Prisma.Decimal(1000),
            managerId: 'manager-1',
            clientId: 'client-1',
            ...opts.deal,
        };

        const prisma = {
            deal: {
                findFirst: jest.fn().mockResolvedValue(deal),
                findUniqueOrThrow: jest.fn().mockResolvedValue(deal),
            },
            payment: {
                aggregate: jest.fn().mockResolvedValue({_sum: {amount: opts.totalPaid !== undefined ? new Prisma.Decimal(opts.totalPaid) : null}}),
                create: jest.fn().mockResolvedValue({}),
            },
            paymentSchedule: {
                findMany: jest.fn().mockResolvedValue(opts.schedules ?? []),
                update: jest.fn().mockResolvedValue({}),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };

        const mapper = {toDetails: jest.fn((d: unknown) => d)};
        const domain = new DealDomainService();
        const activityService = {
            paymentReceived: jest.fn().mockResolvedValue({}),
            paymentRefunded: jest.fn().mockResolvedValue({}),
        };
        const dealsService = {tryCompleteWithinTransaction: jest.fn().mockResolvedValue(undefined)};
        const notifications = {create: jest.fn().mockResolvedValue({})};

        const service = new PaymentService(
            prisma as any, mapper as any, domain, activityService as any, dealsService as any, notifications as any,
        );
        return {service, prisma, activityService, dealsService, notifications};
    }

    const paymentDto = (overrides: Record<string, unknown> = {}) => ({
        amount: 200,
        paymentMethod: PaymentMethod.CASH,
        paymentType: PaymentType.DEPOSIT,
        paidAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    }) as any;

    it('rejects when the acting user has no company', async () => {
        const {service} = build({});
        await expect(
            service.create({...user, companyId: null}, 'deal-1', paymentDto()),
        ).rejects.toThrow(ForbiddenException);
    });

    it('throws DealNotFoundException when the deal is missing or out of scope', async () => {
        const {service} = build({deal: null});
        await expect(service.create(user, 'deal-1', paymentDto())).rejects.toThrow(DealNotFoundException);
    });

    it('rejects recording a payment on a deal that is not ACTIVE', async () => {
        const {service} = build({deal: {status: DealStatus.RESERVED}});
        await expect(service.create(user, 'deal-1', paymentDto())).rejects.toThrow();
    });

    it('rejects a payment that would overpay the deal balance', async () => {
        const {service} = build({totalPaid: 900});
        await expect(service.create(user, 'deal-1', paymentDto({amount: 200}))).rejects.toThrow(
            PaymentExceedsBalanceException,
        );
    });

    it('rejects a refund larger than what has actually been paid', async () => {
        const {service} = build({totalPaid: 100});
        await expect(
            service.create(user, 'deal-1', paymentDto({amount: 200, paymentType: PaymentType.REFUND})),
        ).rejects.toThrow(RefundExceedsPaidException);
    });

    it('stores a forward payment as a positive signed amount', async () => {
        const {service, prisma} = build({totalPaid: 0});
        await service.create(user, 'deal-1', paymentDto({amount: 200}));

        expect(prisma.payment.create).toHaveBeenCalledWith({
            data: expect.objectContaining({amount: expect.objectContaining({s: 1})}),
        });
        const created = (prisma.payment.create as jest.Mock).mock.calls[0][0].data.amount as Prisma.Decimal;
        expect(created.toString()).toBe('200');
    });

    it('stores a refund as a negated (negative) signed amount', async () => {
        const {service, prisma} = build({totalPaid: 300});
        await service.create(user, 'deal-1', paymentDto({amount: 200, paymentType: PaymentType.REFUND}));

        const created = (prisma.payment.create as jest.Mock).mock.calls[0][0].data.amount as Prisma.Decimal;
        expect(created.toString()).toBe('-200');
    });

    it('applies a forward payment against outstanding installments oldest-first, filling one before moving to the next', async () => {
        const {service, prisma} = build({
            totalPaid: 0,
            schedules: [
                schedule({id: 'sch-1', order: 1, amount: new Prisma.Decimal(300), paidAmount: new Prisma.Decimal(0)}),
                schedule({id: 'sch-2', order: 2, amount: new Prisma.Decimal(300), paidAmount: new Prisma.Decimal(0)}),
            ],
        });

        await service.create(user, 'deal-1', paymentDto({amount: 400}));

        const updateCalls = (prisma.paymentSchedule.update as jest.Mock).mock.calls;
        expect(updateCalls).toHaveLength(2);
        expect(updateCalls[0][0]).toEqual({
            where: {id: 'sch-1'},
            data: {paidAmount: new Prisma.Decimal(300), status: PaymentScheduleStatus.PAID},
        });
        expect(updateCalls[1][0]).toEqual({
            where: {id: 'sch-2'},
            data: {paidAmount: new Prisma.Decimal(100), status: PaymentScheduleStatus.PARTIAL},
        });
    });

    it('stops applying once the payment is exhausted, leaving later installments untouched', async () => {
        const {service, prisma} = build({
            totalPaid: 0,
            schedules: [
                schedule({id: 'sch-1', order: 1, amount: new Prisma.Decimal(300), paidAmount: new Prisma.Decimal(0)}),
                schedule({id: 'sch-2', order: 2, amount: new Prisma.Decimal(300), paidAmount: new Prisma.Decimal(0)}),
            ],
        });

        await service.create(user, 'deal-1', paymentDto({amount: 100}));

        const updateCalls = (prisma.paymentSchedule.update as jest.Mock).mock.calls;
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0][0]).toEqual({
            where: {id: 'sch-1'},
            data: {paidAmount: new Prisma.Decimal(100), status: PaymentScheduleStatus.PARTIAL},
        });
    });

    it('never touches payment-schedule rows for a refund', async () => {
        const {service, prisma} = build({
            totalPaid: 300,
            schedules: [schedule()],
        });

        await service.create(user, 'deal-1', paymentDto({amount: 100, paymentType: PaymentType.REFUND}));

        expect(prisma.paymentSchedule.update).not.toHaveBeenCalled();
    });

    it('logs a refund activity and never attempts deal completion on a refund', async () => {
        const {service, activityService, dealsService} = build({totalPaid: 300});
        await service.create(user, 'deal-1', paymentDto({amount: 100, paymentType: PaymentType.REFUND}));

        expect(activityService.paymentRefunded).toHaveBeenCalled();
        expect(activityService.paymentReceived).not.toHaveBeenCalled();
        expect(dealsService.tryCompleteWithinTransaction).not.toHaveBeenCalled();
    });

    it('logs a payment-received activity and attempts deal completion on a forward payment', async () => {
        const {service, activityService, dealsService} = build({totalPaid: 0});
        await service.create(user, 'deal-1', paymentDto({amount: 200}));

        expect(activityService.paymentReceived).toHaveBeenCalled();
        expect(activityService.paymentRefunded).not.toHaveBeenCalled();
        expect(dealsService.tryCompleteWithinTransaction).toHaveBeenCalled();
    });

    it('notifies the deal manager when one is assigned', async () => {
        const {service, notifications} = build({totalPaid: 0, deal: {managerId: 'manager-1'}});
        await service.create(user, 'deal-1', paymentDto({amount: 200}));

        expect(notifications.create).toHaveBeenCalledWith(
            expect.objectContaining({userId: 'manager-1', entityId: 'deal-1'}),
        );
    });

    it('skips the notification when the deal has no manager', async () => {
        const {service, notifications} = build({totalPaid: 0, deal: {managerId: null}});
        await service.create(user, 'deal-1', paymentDto({amount: 200}));

        expect(notifications.create).not.toHaveBeenCalled();
    });

    it('scopes the deal lookup to the requesting branch for branch-scoped roles', async () => {
        const branchUser = {id: 'u2', role: UserRole.SALES_MANAGER, companyId: 'company-1', branchId: 'branch-9'} as any;
        const {service, prisma} = build({totalPaid: 0});
        await service.create(branchUser, 'deal-1', paymentDto({amount: 100}));

        expect(prisma.deal.findFirst).toHaveBeenCalledWith({
            where: {id: 'deal-1', companyId: 'company-1', branchId: 'branch-9'},
        });
    });
});
