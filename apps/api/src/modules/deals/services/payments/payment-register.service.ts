import { ForbiddenException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  DealStatus,
  PaymentMethod,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuthUser } from '@/common/types/auth-user.type';
import {
  PaymentRegisterQueryDto,
  ReceivablesQueryDto,
} from '../../dto/payments/payment-register-query.dto';

const PAYMENT_INCLUDE = {
  user: { select: { id: true, fullName: true } },
  deal: {
    select: {
      id: true,
      dealNumber: true,
      status: true,
      client: { select: { id: true, fullName: true } },
      unit: { select: { number: true } },
      project: { select: { name: true } },
      branch: { select: { name: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

// English labels for the Excel files, like the funnel export's sheets.
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  MBANK: 'MBank',
  OPTIMA: 'Optima',
  ELKART: 'Elkart',
  OTHER: 'Other',
};
const TYPE_LABELS: Record<PaymentType, string> = {
  DEPOSIT: 'Deposit',
  INSTALLMENT: 'Installment',
  FINAL: 'Final payment',
  REFUND: 'Refund',
};

// Deals the client still owes on: the contract is signed and the sale isn't
// finished. A reservation can still fall through, so it isn't owed yet.
const RECEIVABLE_STATUSES: DealStatus[] = [
  DealStatus.CONTRACT_SIGNED,
  DealStatus.ACTIVE,
];

const EXPORT_ROW_LIMIT = 50_000;

/**
 * FIN-2: every payment across deals in one list, for reconciling against the
 * bank statement and the cash book, plus the two Excel files month-end needs:
 * the payments themselves and what each client still owes. Scoped like the
 * deals list (BR-B1): a branch-scoped user sees their own branch only.
 */
@Injectable()
export class PaymentRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: PaymentRegisterQueryDto) {
    const where = this.buildWhere(user, query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total, received, refunded, byMethod] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where: { AND: [where, { amount: { gt: 0 } }] },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { AND: [where, { amount: { lt: 0 } }] },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const receivedTotal = Number(received._sum.amount ?? 0);
    const refundedTotal = -Number(refunded._sum.amount ?? 0);

    return {
      items: rows.map((row) => this.toItem(row)),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
      totals: {
        count: total,
        received: receivedTotal,
        refunded: refundedTotal,
        net: receivedTotal - refundedTotal,
        byMethod: Object.values(PaymentMethod).map((method) => ({
          method,
          amount: Number(
            byMethod.find((m) => m.paymentMethod === method)?._sum.amount ?? 0,
          ),
        })),
      },
    };
  }

  async exportXlsx(
    user: AuthUser,
    query: PaymentRegisterQueryDto,
  ): Promise<Buffer> {
    const where = this.buildWhere(user, query);
    const rows = await this.prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      take: EXPORT_ROW_LIMIT,
    });

    const sheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        Date: dayOf(row.paidAt),
        Receipt: row.receiptNumber ?? '',
        Deal: row.deal.dealNumber,
        Client: row.deal.client.fullName,
        Project: row.deal.project.name,
        Unit: row.deal.unit.number,
        Branch: row.deal.branch?.name ?? '',
        Type: TYPE_LABELS[row.paymentType],
        Method: METHOD_LABELS[row.paymentMethod],
        Reference: row.reference ?? '',
        Note: row.note ?? '',
        'Recorded by': row.user?.fullName ?? '',
        Amount: Number(row.amount),
      })),
    );

    const received = rows
      .filter((r) => Number(r.amount) > 0)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const refunded = -rows
      .filter((r) => Number(r.amount) < 0)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const summary = XLSX.utils.json_to_sheet([
      {
        Item: 'Period',
        Value: `${query.from ?? 'start'} to ${query.to ?? 'today'}`,
      },
      { Item: 'Payments', Value: rows.length },
      { Item: 'Received', Value: received },
      { Item: 'Refunded', Value: refunded },
      { Item: 'Net', Value: received - refunded },
      ...Object.values(PaymentMethod).map((method) => ({
        Item: `Net, ${METHOD_LABELS[method]}`,
        Value: rows
          .filter((r) => r.paymentMethod === method)
          .reduce((sum, r) => sum + Number(r.amount), 0),
      })),
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Payments');
    XLSX.utils.book_append_sheet(workbook, summary, 'Summary');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * One row per deal the client still owes on, as of today: paid so far,
   * what's left, what's overdue and what falls due next.
   */
  async exportReceivablesXlsx(
    user: AuthUser,
    query: ReceivablesQueryDto,
  ): Promise<Buffer> {
    const companyId = this.companyIdOf(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deals = await this.prisma.deal.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: RECEIVABLE_STATUSES },
        projectId: query.projectId,
        branchId: user.isBranchScoped ? user.branchId : query.branchId,
      },
      orderBy: { dealNumber: 'asc' },
      include: {
        client: { select: { fullName: true, phone: true } },
        manager: { select: { fullName: true } },
        project: { select: { name: true } },
        unit: { select: { number: true } },
        branch: { select: { name: true } },
        payments: { where: { deletedAt: null }, select: { amount: true } },
        paymentSchedules: {
          where: {
            deletedAt: null,
            status: { not: PaymentScheduleStatus.PAID },
          },
          orderBy: { dueDate: 'asc' },
          select: {
            dueDate: true,
            amount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
    });

    const sheet = XLSX.utils.json_to_sheet(
      deals.map((deal) => {
        const salePrice = Number(deal.salePrice);
        const paid = deal.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const open = deal.paymentSchedules.map((s) => ({
          dueDate: s.dueDate,
          left: Number(s.amount) - Number(s.paidAmount),
          overdue: s.status === PaymentScheduleStatus.OVERDUE,
        }));
        const overdue = open.filter((s) => s.overdue);
        const next = open.find((s) => !s.overdue && s.dueDate >= today);

        return {
          Deal: deal.dealNumber,
          Status:
            deal.status === DealStatus.ACTIVE ? 'Active' : 'Contract signed',
          Client: deal.client.fullName,
          Phone: deal.client.phone ?? '',
          Project: deal.project.name,
          Unit: deal.unit.number,
          Branch: deal.branch?.name ?? '',
          Manager: deal.manager?.fullName ?? '',
          'Sale price': salePrice,
          Paid: round2(paid),
          Remaining: round2(salePrice - paid),
          Overdue: round2(overdue.reduce((sum, s) => sum + s.left, 0)),
          'Overdue installments': overdue.length,
          'Overdue since': overdue[0] ? dayOf(overdue[0].dueDate) : '',
          'Next due date': next ? dayOf(next.dueDate) : '',
          'Next due amount': next ? round2(next.left) : '',
        };
      }),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      `Receivables ${dayOf(today)}`,
    );
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private buildWhere(
    user: AuthUser,
    query: PaymentRegisterQueryDto,
  ): Prisma.PaymentWhereInput {
    const companyId = this.companyIdOf(user);

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      paymentMethod: query.paymentMethod,
      paymentType: query.paymentType,
      deal: {
        companyId,
        projectId: query.projectId,
        branchId: user.isBranchScoped ? user.branchId : query.branchId,
      },
    };

    if (query.from || query.to) {
      where.paidAt = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lt: nextDay(query.to) } : {}),
      };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { deal: { dealNumber: { contains: search, mode: 'insensitive' } } },
        {
          deal: {
            client: { fullName: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    return where;
  }

  private toItem(row: PaymentRow) {
    return {
      id: row.id,
      paidAt: row.paidAt,
      amount: Number(row.amount),
      paymentMethod: row.paymentMethod,
      paymentType: row.paymentType,
      reference: row.reference,
      note: row.note,
      receiptNumber: row.receiptNumber,
      recordedBy: row.user,
      deal: {
        id: row.deal.id,
        dealNumber: row.deal.dealNumber,
        status: row.deal.status,
      },
      client: row.deal.client,
      unitNumber: row.deal.unit.number,
      projectName: row.deal.project.name,
      branchName: row.deal.branch?.name ?? null,
    };
  }

  private companyIdOf(user: AuthUser): string {
    if (!user.companyId)
      throw new ForbiddenException('User does not belong to a company');
    return user.companyId;
  }
}

/** Payment dates are calendar days stored as that day's UTC midnight. */
function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextDay(day: string): Date {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
