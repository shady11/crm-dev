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
import { unitLabel } from '@/common/utils/unit-label.util';
import { exportLabels } from '@/common/i18n/export-labels';
import { documentFormatter, type DocumentLanguage } from '@/modules/document-generation/document-language';

const PAYMENT_INCLUDE = {
  user: { select: { id: true, fullName: true } },
  deal: {
    select: {
      id: true,
      dealNumber: true,
      status: true,
      client: { select: { id: true, fullName: true } },
      unit: { select: { number: true, block: { select: { name: true } } } },
      project: { select: { name: true } },
      branch: { select: { name: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

// English labels for the Excel files, like the funnel export's sheets.

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
    language: DocumentLanguage = 'en',
  ): Promise<Buffer> {
    const L = exportLabels(language).payments;
    const f = documentFormatter(language);
    const where = this.buildWhere(user, query);
    const rows = await this.prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      take: EXPORT_ROW_LIMIT,
    });

    const sheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        [L.date]: dayOf(row.paidAt),
        [L.receipt]: row.receiptNumber ?? '',
        [L.deal]: row.deal.dealNumber,
        [L.client]: row.deal.client.fullName,
        [L.project]: row.deal.project.name,
        [L.unit]: unitLabel(row.deal.unit),
        [L.branch]: row.deal.branch?.name ?? '',
        [L.type]: f.paymentType(row.paymentType),
        [L.method]: f.paymentMethod(row.paymentMethod),
        [L.reference]: row.reference ?? '',
        [L.note]: row.note ?? '',
        [L.recordedBy]: row.user?.fullName ?? '',
        [L.amount]: Number(row.amount),
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
        [L.item]: L.period,
        [L.value]: L.periodRange(query.from ?? L.start, query.to ?? L.today),
      },
      { [L.item]: L.count, [L.value]: rows.length },
      { [L.item]: L.received, [L.value]: received },
      { [L.item]: L.refunded, [L.value]: refunded },
      { [L.item]: L.net, [L.value]: received - refunded },
      ...Object.values(PaymentMethod).map((method) => ({
        [L.item]: L.netBy(f.paymentMethod(method)),
        [L.value]: rows
          .filter((r) => r.paymentMethod === method)
          .reduce((sum, r) => sum + Number(r.amount), 0),
      })),
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, L.sheet);
    XLSX.utils.book_append_sheet(workbook, summary, L.summarySheet);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * One row per deal the client still owes on, as of today: paid so far,
   * what's left, what's overdue and what falls due next.
   */
  async exportReceivablesXlsx(
    user: AuthUser,
    query: ReceivablesQueryDto,
    language: DocumentLanguage = 'en',
  ): Promise<Buffer> {
    const labels = exportLabels(language);
    const L = labels.receivables;
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
        unit: { select: { number: true, block: { select: { name: true } } } },
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
          [L.deal]: deal.dealNumber,
          [L.status]: labels.dealStatus[deal.status] ?? deal.status,
          [L.client]: deal.client.fullName,
          [L.phone]: deal.client.phone ?? '',
          [L.project]: deal.project.name,
          [L.unit]: unitLabel(deal.unit),
          [L.branch]: deal.branch?.name ?? '',
          [L.manager]: deal.manager?.fullName ?? '',
          [L.salePrice]: salePrice,
          [L.paid]: round2(paid),
          [L.remaining]: round2(salePrice - paid),
          [L.overdue]: round2(overdue.reduce((sum, s) => sum + s.left, 0)),
          [L.overdueInstallments]: overdue.length,
          [L.overdueSince]: overdue[0] ? dayOf(overdue[0].dueDate) : '',
          [L.nextDueDate]: next ? dayOf(next.dueDate) : '',
          [L.nextDueAmount]: next ? round2(next.left) : '',
        };
      }),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      L.sheet(dayOf(today)),
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
      blockName: row.deal.unit.block?.name ?? null,
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
