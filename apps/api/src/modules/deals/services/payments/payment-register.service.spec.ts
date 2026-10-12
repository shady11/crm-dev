import * as XLSX from 'xlsx';
import {
  DealStatus,
  PaymentMethod,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
} from '@/generated/prisma/client';
import { PaymentRegisterService } from './payment-register.service';

/**
 * FIN-2: the payments register is Finance's reconciliation view, so its
 * scope (company, branch for branch-scoped roles), its day-based period and
 * its received / refunded / net totals have to be exactly right.
 */
describe('PaymentRegisterService', () => {
  const financeUser = {
    id: 'finance-1',
    companyId: 'company-1',
    isBranchScoped: false,
    branchId: null,
  } as any;
  const headUser = {
    id: 'head-1',
    companyId: 'company-1',
    isBranchScoped: true,
    branchId: 'branch-1',
  } as any;

  function paymentRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pay-1',
      paidAt: new Date('2026-10-05T00:00:00.000Z'),
      createdAt: new Date('2026-10-05T08:00:00.000Z'),
      amount: new Prisma.Decimal(1000),
      paymentMethod: PaymentMethod.CASH,
      paymentType: PaymentType.INSTALLMENT,
      reference: 'PMT-1',
      receiptNumber: 'R-2026-0001',
      note: null,
      user: { id: 'finance-1', fullName: 'Nurgul Baktybekova' },
      deal: {
        id: 'deal-1',
        dealNumber: 'D-2026-0001',
        status: DealStatus.ACTIVE,
        client: { id: 'client-1', fullName: 'Aibek Asanov' },
        unit: { number: '101' },
        project: { name: 'Orion' },
        branch: { name: 'Bishkek Central' },
      },
      ...overrides,
    };
  }

  function build(rows = [paymentRow()]) {
    const prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(rows.length),
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(1500) } })
          .mockResolvedValueOnce({
            _sum: { amount: new Prisma.Decimal(-500) },
          }),
        groupBy: jest.fn().mockResolvedValue([
          {
            paymentMethod: PaymentMethod.CASH,
            _sum: { amount: new Prisma.Decimal(1000) },
          },
        ]),
      },
      deal: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { service: new PaymentRegisterService(prisma as any), prisma };
  }

  it('turns from/to days into an inclusive range, to the start of the day after "to"', async () => {
    const { service, prisma } = build();
    await service.findAll(financeUser, {
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(prisma.payment.findMany.mock.calls[0][0].where.paidAt).toEqual({
      gte: new Date('2026-10-01T00:00:00.000Z'),
      lt: new Date('2026-11-01T00:00:00.000Z'),
    });
  });

  it('keeps a branch-scoped user on their own branch, whatever branchId they pass', async () => {
    const { service, prisma } = build();
    await service.findAll(headUser, { branchId: 'branch-9' });

    expect(prisma.payment.findMany.mock.calls[0][0].where.deal).toEqual(
      expect.objectContaining({ companyId: 'company-1', branchId: 'branch-1' }),
    );
  });

  it('lets a company-wide user narrow to a branch and a project', async () => {
    const { service, prisma } = build();
    await service.findAll(financeUser, {
      branchId: 'branch-9',
      projectId: 'project-1',
    });

    expect(prisma.payment.findMany.mock.calls[0][0].where.deal).toEqual({
      companyId: 'company-1',
      branchId: 'branch-9',
      projectId: 'project-1',
    });
  });

  it('never lists soft-deleted payments', async () => {
    const { service, prisma } = build();
    await service.findAll(financeUser, {});

    expect(prisma.payment.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it('searches reference, deal number and client name', async () => {
    const { service, prisma } = build();
    await service.findAll(financeUser, { search: ' D-2026 ' });

    expect(prisma.payment.findMany.mock.calls[0][0].where.OR).toEqual([
      { reference: { contains: 'D-2026', mode: 'insensitive' } },
      { deal: { dealNumber: { contains: 'D-2026', mode: 'insensitive' } } },
      {
        deal: {
          client: { fullName: { contains: 'D-2026', mode: 'insensitive' } },
        },
      },
    ]);
  });

  it('reports received, refunded and net over the whole filter, and fills every method', async () => {
    const { service } = build();
    const result = await service.findAll(financeUser, {});

    expect(result.totals).toEqual(
      expect.objectContaining({ received: 1500, refunded: 500, net: 1000 }),
    );
    expect(result.totals.byMethod).toHaveLength(
      Object.values(PaymentMethod).length,
    );
    expect(
      result.totals.byMethod.find((m) => m.method === PaymentMethod.MBANK)
        ?.amount,
    ).toBe(0);
  });

  it('lists each payment with its deal, client and who recorded it', async () => {
    const { service } = build();
    const result = await service.findAll(financeUser, {});

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        amount: 1000,
        receiptNumber: 'R-2026-0001',
        recordedBy: { id: 'finance-1', fullName: 'Nurgul Baktybekova' },
        deal: {
          id: 'deal-1',
          dealNumber: 'D-2026-0001',
          status: DealStatus.ACTIVE,
        },
        client: { id: 'client-1', fullName: 'Aibek Asanov' },
        unitNumber: '101',
        branchName: 'Bishkek Central',
      }),
    );
  });

  it('exports every matching payment with a summary that nets refunds', async () => {
    const { service } = build([
      paymentRow(),
      paymentRow({
        id: 'pay-2',
        amount: new Prisma.Decimal(-300),
        receiptNumber: null,
        paymentType: PaymentType.REFUND,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }),
    ]);

    const workbook = XLSX.read(
      await service.exportXlsx(financeUser, {
        from: '2026-10-01',
        to: '2026-10-31',
      }),
    );
    const payments = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.Payments,
    );
    const summary = XLSX.utils.sheet_to_json<{ Item: string; Value: unknown }>(
      workbook.Sheets.Summary,
    );

    expect(payments).toHaveLength(2);
    expect(payments[0]).toEqual(
      expect.objectContaining({ Receipt: 'R-2026-0001' }),
    );
    expect(payments[1]).toEqual(
      expect.objectContaining({
        Date: '2026-10-05',
        Receipt: '',
        Type: 'Refund',
        Method: 'Bank transfer',
        Amount: -300,
      }),
    );
    expect(summary.find((r) => r.Item === 'Net')?.Value).toBe(700);
    expect(summary.find((r) => r.Item === 'Refunded')?.Value).toBe(300);
  });

  it('exports receivables per open deal: paid, remaining, overdue and next due', async () => {
    const { service, prisma } = build();
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    prisma.deal.findMany.mockResolvedValue([
      {
        dealNumber: 'D-2026-0001',
        status: DealStatus.ACTIVE,
        salePrice: new Prisma.Decimal(10000),
        client: { fullName: 'Aibek Asanov', phone: '+996555000000' },
        manager: { fullName: 'Tilek Tashiev' },
        project: { name: 'Orion' },
        unit: { number: '101' },
        branch: { name: 'Bishkek Central' },
        payments: [{ amount: new Prisma.Decimal(4000) }],
        paymentSchedules: [
          {
            dueDate: new Date('2026-09-01T00:00:00.000Z'),
            amount: new Prisma.Decimal(3000),
            paidAmount: new Prisma.Decimal(1000),
            status: PaymentScheduleStatus.OVERDUE,
          },
          {
            dueDate: future,
            amount: new Prisma.Decimal(3000),
            paidAmount: new Prisma.Decimal(0),
            status: PaymentScheduleStatus.PENDING,
          },
        ],
      },
    ]);

    const workbook = XLSX.read(
      await service.exportReceivablesXlsx(headUser, { branchId: 'branch-9' }),
    );
    const [row] = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]],
    );

    expect(prisma.deal.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        branchId: 'branch-1',
        status: { in: [DealStatus.CONTRACT_SIGNED, DealStatus.ACTIVE] },
      }),
    );
    expect(row).toEqual(
      expect.objectContaining({
        Paid: 4000,
        Remaining: 6000,
        Overdue: 2000,
        'Overdue installments': 1,
        'Overdue since': '2026-09-01',
        'Next due amount': 3000,
      }),
    );
  });
});
