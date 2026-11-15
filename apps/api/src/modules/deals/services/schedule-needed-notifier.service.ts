import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
} from '@/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RbacService } from '@/modules/rbac/rbac.service';
import { formatMoney } from '../deal.constants';

type ActivatedDeal = {
  id: string;
  companyId: string;
  branchId: string | null;
  dealNumber: string;
  salePrice: { toString(): string } | number;
};

/**
 * E2E-4: once a manager activates a deal, the next step is Finance's (a
 * payment schedule), but nothing told them. Finance is whoever holds
 * dashboard.finance_overview, as for MoneyHeldNotifier. A branch's deal goes
 * to that branch's Finance and to company-wide Finance. The ask is resolved
 * when the schedule is made, so it doesn't sit in the bell as a to-do.
 * Neither step ever fails the action that triggered it.
 */
@Injectable()
export class ScheduleNeededNotifier {
  private readonly logger = new Logger(ScheduleNeededNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly rbacService: RbacService,
  ) {}

  async notifyActivated(deal: ActivatedDeal, actorId: string): Promise<void> {
    try {
      const paid = await this.prisma.payment.aggregate({
        where: { dealId: deal.id, deletedAt: null },
        _sum: { amount: true },
      });
      const remaining = Number(deal.salePrice) - Number(paid._sum.amount ?? 0);
      if (remaining <= 0) return;

      const financeRoleIds = await this.rbacService.findRoleIdsWithPermission(
        deal.companyId,
        'dashboard.finance_overview',
      );
      if (financeRoleIds.length === 0) return;

      const [recipients, company] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            companyId: deal.companyId,
            roleId: { in: financeRoleIds },
            isActive: true,
            id: { not: actorId },
            OR: deal.branchId
              ? [{ branchId: deal.branchId }, { branchId: null }]
              : [{ branchId: null }],
          },
          select: { id: true },
        }),
        this.prisma.company.findUnique({
          where: { id: deal.companyId },
          select: { currency: true },
        }),
      ]);
      const currency = company?.currency ?? null;

      for (const recipient of recipients) {
        await this.notifications.create({
          companyId: deal.companyId,
          userId: recipient.id,
          type: NotificationType.PAYMENT_SCHEDULE_NEEDED,
          title: `Deal ${deal.dealNumber} is active and needs a payment schedule`,
          message: `${formatMoney(remaining, currency)} left to pay.`,
          templateKey: 'paymentScheduleNeeded',
          params: { dealNumber: deal.dealNumber, amount: remaining, currency },
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to tell Finance deal ${deal.id} needs a schedule`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async resolveScheduled(
    deal: { id: string; companyId: string; dealNumber: string },
    byName: string,
  ): Promise<void> {
    try {
      await this.notifications.resolveForEntity({
        companyId: deal.companyId,
        type: NotificationType.PAYMENT_SCHEDULE_NEEDED,
        entityType: NotificationEntityType.DEAL,
        entityId: deal.id,
        resolvedType: NotificationType.PAYMENT_SCHEDULE_CREATED,
        title: `Payment schedule for deal ${deal.dealNumber} made by ${byName}`,
        templateKey: 'paymentScheduleCreated',
        params: { dealNumber: deal.dealNumber, byName },
      });
    } catch (error) {
      this.logger.error(
        `Failed to resolve schedule-needed notifications for deal ${deal.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
