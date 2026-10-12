import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityType,
  DealStatus,
  NotificationEntityType,
  NotificationType,
  PaymentSchedule,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuthUser } from '@/common/types/auth-user.type';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { DealActivityService } from '../deal-activity.service';
import { DealMapper } from '../../mappers/deal.mapper';
import { DEAL_DETAILS_INCLUDE, formatMoney } from '../../deal.constants';
import { DealNotFoundException } from '../../exceptions';
import { VoidPaymentDto } from '../../dto/payments/void-payment.dto';
import { activityText } from '@/modules/activities/activity-templates';

/**
 * FIN-3: takes a mistyped payment off the books. The row stays, marked void
 * (deletedAt) with who did it and why, and keeps its receipt number, so the
 * receipt sequence has no gap and the audit trail survives. Everything that
 * sums payments already skips voided rows; this also unwinds what the
 * payment did to the schedule and, if it had completed the deal, reopens it.
 */
@Injectable()
export class PaymentVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: DealMapper,
    private readonly activityService: DealActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  async void(
    user: AuthUser,
    dealId: string,
    paymentId: string,
    dto: VoidPaymentDto,
  ) {
    if (!user.companyId)
      throw new ForbiddenException('User does not belong to a company');
    const companyId = user.companyId;

    const { result, payment, manager } = await this.prisma.$transaction(
      async (db) => {
        const deal = await db.deal.findFirst({
          where: {
            id: dealId,
            companyId,
            ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
          },
        });
        if (!deal) throw new DealNotFoundException(dealId);

        const payment = await db.payment.findFirst({
          where: { id: paymentId, dealId, deletedAt: null },
        });
        if (!payment)
          throw new NotFoundException('Payment not found, or already voided');

        // A refund was never applied to the schedule (see PaymentService),
        // so voiding one only puts the money back on the deal's total.
        if (payment.paymentType !== PaymentType.REFUND) {
          const schedules = await db.paymentSchedule.findMany({
            where: { dealId, deletedAt: null },
            orderBy: { order: 'asc' },
          });
          for (const change of unwindSchedule(schedules, payment)) {
            await db.paymentSchedule.update({
              where: { id: change.id },
              data: change.data,
            });
          }

          // The payment may have been the one that completed the sale.
          if (deal.status === DealStatus.COMPLETED) {
            await db.deal.update({
              where: { id: dealId },
              data: { status: DealStatus.ACTIVE },
            });
          }
        }

        await db.payment.update({
          where: { id: paymentId },
          data: {
            deletedAt: new Date(),
            voidReason: dto.reason,
            voidedById: user.id,
          },
        });

        const label =
          payment.receiptNumber ??
          formatMoney(payment.amount, user.company?.currency);
        await this.activityService.create({
          db,
          companyId,
          userId: user.id,
          dealId,
          clientId: deal.clientId,
          action: ActivityAction.UPDATED_DEAL,
          type: ActivityType.DEAL_UPDATED,
          ...activityText('paymentVoided', { payment: label }),
          description: dto.reason,
          metadata: {
            paymentId,
            amount: Number(payment.amount),
            receiptNumber: payment.receiptNumber,
            reason: dto.reason,
          },
        });

        const result = await db.deal.findUniqueOrThrow({
          where: { id: dealId },
          include: DEAL_DETAILS_INCLUDE,
        });
        return { result, payment, manager: deal.managerId };
      },
    );

    // The deal's manager hears about it, unless they voided it themselves.
    if (manager && manager !== user.id) {
      const amount = Math.abs(Number(payment.amount));
      await this.notifications.create({
        companyId,
        userId: manager,
        type: NotificationType.PAYMENT_RECEIVED,
        title: `Payment of ${formatMoney(amount, user.company?.currency)} on deal ${result.dealNumber} was voided`,
        message: dto.reason,
        templateKey: 'paymentVoided',
        params: {
          dealNumber: result.dealNumber,
          amount,
          currency: user.company?.currency ?? null,
          reason: dto.reason,
        },
        entityType: NotificationEntityType.DEAL,
        entityId: dealId,
      });
    }

    return this.mapper.toDetails(result);
  }
}

type ScheduleChange = { id: string; data: Prisma.PaymentScheduleUpdateInput };

/**
 * What voiding a forward payment does to the schedule. A payment recorded
 * after the schedule was generated was applied to installments oldest
 * first, so it comes off the latest-covered ones first. A payment taken
 * before the schedule existed (FIN-9) reduced what the schedule spread, so
 * the amount goes back onto the last installment instead.
 */
export function unwindSchedule(
  schedules: PaymentSchedule[],
  payment: { amount: Prisma.Decimal; createdAt: Date },
  today: Date = startOfToday(),
): ScheduleChange[] {
  if (schedules.length === 0) return [];

  const generatedAt = schedules.reduce(
    (min, s) => (s.createdAt < min ? s.createdAt : min),
    schedules[0].createdAt,
  );

  if (payment.createdAt < generatedAt) {
    const last = schedules[schedules.length - 1];
    const amount = last.amount.plus(payment.amount);
    return [
      {
        id: last.id,
        data: {
          amount,
          status: statusFor(amount, last.paidAmount, last.dueDate, today),
        },
      },
    ];
  }

  const changes: ScheduleChange[] = [];
  let left = payment.amount;
  for (const schedule of [...schedules].reverse()) {
    if (left.lessThanOrEqualTo(0)) break;
    const taken = Prisma.Decimal.min(schedule.paidAmount, left);
    if (taken.lessThanOrEqualTo(0)) continue;
    const paidAmount = schedule.paidAmount.minus(taken);
    changes.push({
      id: schedule.id,
      data: {
        paidAmount,
        status: statusFor(schedule.amount, paidAmount, schedule.dueDate, today),
      },
    });
    left = left.minus(taken);
  }
  return changes;
}

// Overdue the way the reminder job decides it: due before today, not paid.
function statusFor(
  amount: Prisma.Decimal,
  paid: Prisma.Decimal,
  dueDate: Date,
  today: Date,
): PaymentScheduleStatus {
  if (paid.greaterThanOrEqualTo(amount)) return PaymentScheduleStatus.PAID;
  if (dueDate < today) return PaymentScheduleStatus.OVERDUE;
  return paid.greaterThan(0)
    ? PaymentScheduleStatus.PARTIAL
    : PaymentScheduleStatus.PENDING;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
