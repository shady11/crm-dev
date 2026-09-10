import {BadRequestException} from '@nestjs/common';
import {DealStatus, PaymentScheduleStatus, Prisma, UserRole} from '@/generated/prisma/client';
import {PaymentScheduleService} from './payment-schedule.service';
import {DealDomainService} from '../deal-domain.service';
import {DealNotFoundException, PaymentScheduleAlreadyGeneratedException} from '../../exceptions';

/**
 * Generating a payment schedule splits a deal's remaining balance into N
 * installments. The money-correctness invariant that matters most here: the
 * installments must sum to EXACTLY the remaining balance, to the cent, even
 * when the division doesn't come out even — which is why the last
 * installment absorbs the rounding remainder instead of each one being
 * independently rounded.
 */
describe('PaymentScheduleService.generate', () => {
    const user = {
        id: 'user-1',
        role: UserRole.COMPANY_ADMIN,
        companyId: 'company-1',
        branchId: null,
    } as any;

    function build(deal: Record<string, unknown> | null, totalPaid: number | null, existingSchedule: unknown = null) {
        const createdDeal = {id: 'deal-1', ...deal};
        const prisma = {
            deal: {
                findFirst: jest.fn().mockResolvedValue(deal ? createdDeal : null),
                findUniqueOrThrow: jest.fn().mockResolvedValue(createdDeal),
            },
            paymentSchedule: {
                findFirst: jest.fn().mockResolvedValue(existingSchedule),
                createMany: jest.fn().mockResolvedValue({count: 0}),
            },
            payment: {
                aggregate: jest.fn().mockResolvedValue({_sum: {amount: totalPaid === null ? null : new Prisma.Decimal(totalPaid)}}),
            },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        const mapper = {toDetails: jest.fn((d: unknown) => d)};
        const activityService = {create: jest.fn().mockResolvedValue({})};
        const domain = new DealDomainService();

        const service = new PaymentScheduleService(prisma as any, mapper as any, domain, activityService as any);
        return {service, prisma};
    }

    const dto = (overrides: Record<string, unknown> = {}) => ({
        installments: 3,
        firstPaymentDate: '2026-01-01T00:00:00.000Z',
        ...overrides,
    }) as any;

    it('throws DealNotFoundException when the deal is missing or out of tenant/branch scope', async () => {
        const {service} = build(null, 0);
        await expect(service.generate(user, 'deal-1', dto())).rejects.toThrow(DealNotFoundException);
    });

    it('rejects generating a schedule for a deal that is not ACTIVE', async () => {
        const {service} = build({status: DealStatus.RESERVED, salePrice: new Prisma.Decimal(1000)}, 0);
        await expect(service.generate(user, 'deal-1', dto())).rejects.toThrow();
    });

    it('rejects when a schedule already exists for the deal', async () => {
        const {service} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000)}, 0, {id: 'existing'});
        await expect(service.generate(user, 'deal-1', dto())).rejects.toThrow(PaymentScheduleAlreadyGeneratedException);
    });

    it('rejects when the deal is already fully paid', async () => {
        const {service} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000)}, 1000);
        await expect(service.generate(user, 'deal-1', dto())).rejects.toThrow(BadRequestException);
    });

    it('splits the remaining balance evenly when it divides cleanly', async () => {
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(900)}, 0);
        await service.generate(user, 'deal-1', dto({installments: 3}));

        const rows = (prisma.paymentSchedule.createMany as jest.Mock).mock.calls[0][0].data;
        expect(rows).toHaveLength(3);
        expect(rows.map((r: any) => r.amount.toString())).toEqual(['300', '300', '300']);
    });

    it('puts the full rounding remainder on the last installment so the total matches the remaining balance exactly', async () => {
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000)}, 0);
        await service.generate(user, 'deal-1', dto({installments: 3}));

        const rows = (prisma.paymentSchedule.createMany as jest.Mock).mock.calls[0][0].data;
        const amounts = rows.map((r: any) => new Prisma.Decimal(r.amount));
        const sum = amounts.reduce((a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b), new Prisma.Decimal(0));

        expect(sum.toString()).toBe('1000');
        // Each of the first two installments floors to the cent; the last one absorbs the remainder.
        expect(amounts[0].toString()).toBe('333.33');
        expect(amounts[1].toString()).toBe('333.33');
        expect(amounts[2].toString()).toBe('333.34');
    });

    it('accounts for payments already made when computing the remaining balance to split', async () => {
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000)}, 400);
        await service.generate(user, 'deal-1', dto({installments: 2}));

        const rows = (prisma.paymentSchedule.createMany as jest.Mock).mock.calls[0][0].data;
        expect(rows.map((r: any) => r.amount.toString())).toEqual(['300', '300']);
    });

    it('spaces due dates by the configured interval in months, starting from firstPaymentDate', async () => {
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(300)}, 0);
        await service.generate(user, 'deal-1', dto({installments: 3, intervalMonths: 2, firstPaymentDate: '2026-01-15T00:00:00.000Z'}));

        const rows = (prisma.paymentSchedule.createMany as jest.Mock).mock.calls[0][0].data;
        expect(rows.map((r: any) => r.dueDate.toISOString().slice(0, 10))).toEqual([
            '2026-01-15',
            '2026-03-15',
            '2026-05-15',
        ]);
    });

    it('assigns sequential order starting at 1 and initializes every row as PENDING with zero paidAmount', async () => {
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(300)}, 0);
        await service.generate(user, 'deal-1', dto({installments: 3}));

        const rows = (prisma.paymentSchedule.createMany as jest.Mock).mock.calls[0][0].data;
        expect(rows.map((r: any) => r.order)).toEqual([1, 2, 3]);
        expect(rows.every((r: any) => r.status === PaymentScheduleStatus.PENDING && r.paidAmount === 0)).toBe(true);
    });

    it('scopes the deal lookup to the requesting branch for branch-scoped roles', async () => {
        const branchUser = {id: 'u2', role: UserRole.SALES_MANAGER, companyId: 'company-1', branchId: 'branch-9'} as any;
        const {service, prisma} = build({status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(300)}, 0);
        await service.generate(branchUser, 'deal-1', dto({installments: 1}));

        expect(prisma.deal.findFirst).toHaveBeenCalledWith({
            where: {id: 'deal-1', companyId: 'company-1', branchId: 'branch-9'},
        });
    });
});
