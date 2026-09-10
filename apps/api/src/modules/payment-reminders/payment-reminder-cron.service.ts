import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@/database/prisma.service';
import {
  NotificationEntityType,
  NotificationType,
  PaymentScheduleStatus,
  UserRole,
} from '@/generated/prisma/client';
import { NotificationsService } from '@/modules/notifications/notifications.service';

import { REMINDER_STAGES } from './payment-reminders.constants';
import { OutboundMessageService } from './outbound-message.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class PaymentReminderCronService {
  private readonly logger = new Logger(PaymentReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboundMessages: OutboundMessageService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Once daily — a due date has day granularity, so hourly resolution
   * (as the reservation/task cron jobs use) buys nothing here. Runs two
   * things per open schedule row: the OVERDUE status fix (see the spec —
   * this transition never existed before), and, on an exact escalation
   * day, the client reminder + internal notification from REMINDER_STAGES.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyReminders() {
    const today = startOfDay(new Date());

    const schedules = await this.prisma.paymentSchedule.findMany({
      where: {
        status: {
          in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL],
        },
        deletedAt: null,
        deal: { deletedAt: null },
      },
      include: {
        deal: {
          include: { client: true, company: true },
        },
      },
    });

    let overdueFixed = 0;
    let remindersSent = 0;

    for (const schedule of schedules) {
      const deal = schedule.deal;
      const dueDay = startOfDay(schedule.dueDate);
      const diffDays = Math.round(
        (dueDay.getTime() - today.getTime()) / DAY_MS,
      );

      if (diffDays < 0 && schedule.status !== PaymentScheduleStatus.OVERDUE) {
        await this.prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: PaymentScheduleStatus.OVERDUE },
        });
        overdueFixed++;
      }

      const stage = REMINDER_STAGES.find((s) => s.offsetDays === diffDays);
      if (!stage) continue;

      const alreadySent = await this.outboundMessages.alreadySentToday(
        schedule.id,
        stage.templateKey,
      );
      if (alreadySent) continue;

      await this.outboundMessages.sendReminder({
        companyId: deal.companyId,
        companyName: deal.company.name,
        client: deal.client,
        dealNumber: deal.dealNumber,
        scheduleId: schedule.id,
        scheduleAmount: schedule.amount,
        scheduleDueDate: schedule.dueDate,
        templateKey: stage.templateKey,
      });
      remindersSent++;

      if (deal.managerId) {
        await this.notifyOnce({
          userId: deal.managerId,
          companyId: deal.companyId,
          type: stage.notificationType,
          entityId: schedule.id,
          title: stage.managerTitle(deal.dealNumber),
        });
      }

      if (stage.notifySalesHead && deal.branchId) {
        const salesHeads = await this.prisma.user.findMany({
          where: {
            companyId: deal.companyId,
            branchId: deal.branchId,
            role: UserRole.SALES_HEAD,
            isActive: true,
          },
          select: { id: true },
        });

        for (const head of salesHeads) {
          await this.notifyOnce({
            userId: head.id,
            companyId: deal.companyId,
            type: stage.notificationType,
            entityId: schedule.id,
            title: stage.managerTitle(deal.dealNumber),
          });
        }
      }
    }

    this.logger.log(
      `Payment reminders: ${overdueFixed} schedule(s) marked overdue, ${remindersSent} reminder(s) sent`,
    );
  }

  /** Same lookback-dedup convention as NotificationsCronService.notifyOnce. */
  private async notifyOnce(params: {
    userId: string;
    companyId: string;
    type: NotificationType;
    entityId: string;
    title: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        entityType: NotificationEntityType.PAYMENT_SCHEDULE,
        entityId: params.entityId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) return;

    await this.notifications.create({
      userId: params.userId,
      companyId: params.companyId,
      type: params.type,
      entityType: NotificationEntityType.PAYMENT_SCHEDULE,
      entityId: params.entityId,
      title: params.title,
    });
  }
}
