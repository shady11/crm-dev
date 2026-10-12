import { NotFoundException } from '@nestjs/common';
import {
  DealStatus,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
} from '@/generated/prisma/client';
import { PaymentVoidService, unwindSchedule } from './payment-void.service';
import { DealNotFoundException } from '../../exceptions';

const D = (n: number) => new Prisma.Decimal(n);
const generatedAt = new Date('2026-06-01T10:00:00.000Z');
const today = new Date('2026-10-12T00:00:00.000Z');

function row(order: number, amount: number, paid: number, due: string) {
  return {
    id: `sch-${order}`,
    dealId: 'deal-1',
    order,
    amount: D(amount),
    paidAmount: D(paid),
    dueDate: new Date(due),
    status: PaymentScheduleStatus.PAID,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    deletedAt: null,
  } as any;
}

describe('unwindSchedule', () => {
  it('takes an applied payment off the latest-covered installments first', () => {
    const schedules = [
      row(1, 1000, 1000, '2026-07-01'),
      row(2, 1000, 1000, '2026-08-01'),
      row(3, 1000, 400, '2026-11-01'),
    ];

    const changes = unwindSchedule(
      schedules,
      { amount: D(900), createdAt: new Date('2026-09-01') },
      today,
    );

    expect(changes).toEqual([
      {
        id: 'sch-3',
        data: { paidAmount: D(0), status: PaymentScheduleStatus.PENDING },
      },
      {
        id: 'sch-2',
        data: { paidAmount: D(500), status: PaymentScheduleStatus.OVERDUE },
      },
    ]);
  });

  it('marks a still-future installment PARTIAL when part of it stays paid', () => {
    const changes = unwindSchedule(
      [row(1, 1000, 1000, '2026-12-01')],
      { amount: D(300), createdAt: new Date('2026-09-01') },
      today,
    );

    expect(changes).toEqual([
      {
        id: 'sch-1',
        data: { paidAmount: D(700), status: PaymentScheduleStatus.PARTIAL },
      },
    ]);
  });

  it('puts a payment taken before the schedule existed back onto the last installment', () => {
    const schedules = [
      row(1, 1000, 0, '2026-11-01'),
      row(2, 1000, 0, '2026-12-01'),
    ];

    const changes = unwindSchedule(
      schedules,
      { amount: D(500), createdAt: new Date('2026-05-01') },
      today,
    );

    expect(changes).toEqual([
      {
        id: 'sch-2',
        data: { amount: D(1500), status: PaymentScheduleStatus.PENDING },
      },
    ]);
  });

  it('does nothing without a schedule', () => {
    expect(
      unwindSchedule([], { amount: D(500), createdAt: new Date() }, today),
    ).toEqual([]);
  });
});

describe('PaymentVoidService.void', () => {
  const finance = {
    id: 'finance-1',
    companyId: 'company-1',
    isBranchScoped: false,
    branchId: null,
    company: { currency: 'KGS' },
  } as any;
  const head = {
    id: 'head-1',
    companyId: 'company-1',
    isBranchScoped: true,
    branchId: 'branch-1',
    company: { currency: 'KGS' },
  } as any;

  function build(
    opts: { deal?: unknown; payment?: unknown; schedules?: unknown[] } = {},
  ) {
    const deal =
      opts.deal === undefined
        ? {
            id: 'deal-1',
            status: DealStatus.ACTIVE,
            clientId: 'client-1',
            managerId: 'manager-1',
            dealNumber: 'D-2026-0001',
          }
        : opts.deal;
    const prisma: any = {
      deal: {
        findFirst: jest.fn().mockResolvedValue(deal),
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'deal-1', dealNumber: 'D-2026-0001' }),
      },
      payment: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opts.payment === undefined
              ? {
                  id: 'pay-1',
                  amount: D(1000),
                  paymentType: PaymentType.INSTALLMENT,
                  receiptNumber: 'R-2026-0007',
                  createdAt: new Date('2026-09-01'),
                }
              : opts.payment,
          ),
        update: jest.fn().mockResolvedValue({}),
      },
      paymentSchedule: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            opts.schedules ?? [row(1, 1000, 1000, '2026-07-01')],
          ),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const mapper = { toDetails: jest.fn((d: unknown) => d) };
    const activityService = { create: jest.fn().mockResolvedValue({}) };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const service = new PaymentVoidService(
      prisma,
      mapper as any,
      activityService as any,
      notifications as any,
    );
    return { service, prisma, activityService, notifications };
  }

  it('marks the payment void with who did it and why, keeping the row', async () => {
    const { service, prisma } = build();

    await service.void(finance, 'deal-1', 'pay-1', {
      reason: 'Typed 10,000 instead of 1,000',
    });

    const data = prisma.payment.update.mock.calls[0][0].data;
    expect(data).toEqual({
      deletedAt: expect.any(Date),
      voidReason: 'Typed 10,000 instead of 1,000',
      voidedById: 'finance-1',
    });
  });

  it('unwinds the installment the payment had filled', async () => {
    const { service, prisma } = build();

    await service.void(finance, 'deal-1', 'pay-1', { reason: 'Wrong deal' });

    expect(prisma.paymentSchedule.update).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      data: expect.objectContaining({ paidAmount: D(0) }),
    });
  });

  it('reopens a deal the payment had completed', async () => {
    const { service, prisma } = build({
      deal: {
        id: 'deal-1',
        status: DealStatus.COMPLETED,
        clientId: 'c1',
        managerId: null,
        dealNumber: 'D-1',
      },
    });

    await service.void(finance, 'deal-1', 'pay-1', {
      reason: 'Final payment bounced',
    });

    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
      data: { status: DealStatus.ACTIVE },
    });
  });

  it('voiding a refund leaves the schedule and the deal status alone', async () => {
    const { service, prisma } = build({
      payment: {
        id: 'pay-2',
        amount: D(-500),
        paymentType: PaymentType.REFUND,
        receiptNumber: null,
        createdAt: new Date(),
      },
    });

    await service.void(finance, 'deal-1', 'pay-2', {
      reason: 'Refund never sent',
    });

    expect(prisma.paymentSchedule.update).not.toHaveBeenCalled();
    expect(prisma.deal.update).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalled();
  });

  it('logs it on the deal and tells the manager', async () => {
    const { service, activityService, notifications } = build();

    await service.void(finance, 'deal-1', 'pay-1', {
      reason: 'Duplicate entry',
    });

    expect(activityService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Payment R-2026-0007 voided',
        description: 'Duplicate entry',
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        templateKey: 'paymentVoided',
        params: expect.objectContaining({
          amount: 1000,
          reason: 'Duplicate entry',
        }),
      }),
    );
  });

  it('refuses a payment already voided or on another deal', async () => {
    const { service, prisma } = build({ payment: null });

    await expect(
      service.void(finance, 'deal-1', 'pay-9', { reason: 'Duplicate entry' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.payment.findFirst.mock.calls[0][0].where).toEqual({
      id: 'pay-9',
      dealId: 'deal-1',
      deletedAt: null,
    });
  });

  it('keeps a branch-scoped user to their own branch', async () => {
    const { service, prisma } = build({ deal: null });

    await expect(
      service.void(head, 'deal-1', 'pay-1', { reason: 'Duplicate entry' }),
    ).rejects.toThrow(DealNotFoundException);
    expect(prisma.deal.findFirst.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ branchId: 'branch-1' }),
    );
  });
});
