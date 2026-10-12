import { Injectable } from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
} from '@/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RbacService } from '@/modules/rbac/rbac.service';
import { formatMoney } from '../deal.constants';

type ClosedDeal = { id: string; companyId: string; dealNumber: string };

/**
 * FIN-12: a reservation that ends cancelled or expired can still hold the
 * client's deposit, and nothing else tells Finance a refund is due. Finance
 * is whoever holds dashboard.finance_overview, the permission that marks a
 * role as the company's finance desk (only Finance's default bundle has it).
 */
@Injectable()
export class MoneyHeldNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly rbacService: RbacService,
  ) {}

  async notifyIfHeld(deal: ClosedDeal): Promise<void> {
    const paid = await this.prisma.payment.aggregate({
      where: { dealId: deal.id, deletedAt: null },
      _sum: { amount: true },
    });
    const held = Number(paid._sum.amount ?? 0);
    if (held <= 0) return;

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
        type: NotificationType.DEAL_STATUS_CHANGED,
        title: `Deal ${deal.dealNumber} closed with ${formatMoney(held, currency)} still held`,
        message:
          'Record the refund once the money has been returned to the client.',
        templateKey: 'moneyHeld',
        params: { dealNumber: deal.dealNumber, amount: held, currency },
        entityType: NotificationEntityType.DEAL,
        entityId: deal.id,
      });
    }
  }
}
