import { NotificationType, Prisma } from '@/generated/prisma/client';
import { ScheduleNeededNotifier } from './schedule-needed-notifier.service';

describe('ScheduleNeededNotifier', () => {
  const deal = {
    id: 'deal-1',
    companyId: 'company-1',
    branchId: 'branch-1',
    dealNumber: 'D-2026-0001',
    salePrice: new Prisma.Decimal(5022000),
  };

  function build(paid: number | null, financeUsers = [{ id: 'finance-1' }]) {
    const prisma = {
      payment: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: paid === null ? null : new Prisma.Decimal(paid) },
        }),
      },
      user: { findMany: jest.fn().mockResolvedValue(financeUsers) },
      company: { findUnique: jest.fn().mockResolvedValue({ currency: 'KGS' }) },
    };
    const notifications = {
      create: jest.fn().mockResolvedValue({}),
      resolveForEntity: jest.fn().mockResolvedValue(1),
    };
    const rbacService = {
      findRoleIdsWithPermission: jest.fn().mockResolvedValue(['role-finance']),
    };
    const notifier = new ScheduleNeededNotifier(
      prisma as any,
      notifications as any,
      rbacService as any,
    );
    return { notifier, prisma, notifications, rbacService };
  }

  it("tells the branch's and company-wide Finance what is left to schedule", async () => {
    const { notifier, prisma, notifications, rbacService } = build(300000);

    await notifier.notifyActivated(deal, 'manager-1');

    expect(rbacService.findRoleIdsWithPermission).toHaveBeenCalledWith(
      'company-1',
      'dashboard.finance_overview',
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roleId: { in: ['role-finance'] },
          isActive: true,
          id: { not: 'manager-1' },
          OR: [{ branchId: 'branch-1' }, { branchId: null }],
        }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'finance-1',
        type: NotificationType.PAYMENT_SCHEDULE_NEEDED,
        templateKey: 'paymentScheduleNeeded',
        params: { dealNumber: 'D-2026-0001', amount: 4722000, currency: 'KGS' },
        entityId: 'deal-1',
      }),
    );
  });

  it('only asks company-wide Finance about a deal with no branch', async () => {
    const { notifier, prisma } = build(0);

    await notifier.notifyActivated({ ...deal, branchId: null }, 'manager-1');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: [{ branchId: null }] }),
      }),
    );
  });

  it('says nothing when nothing is left to pay', async () => {
    const { notifier, notifications } = build(5022000);

    await notifier.notifyActivated(deal, 'manager-1');

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('never throws, so activation is not undone by a notification failure', async () => {
    const { notifier, rbacService } = build(0);
    rbacService.findRoleIdsWithPermission.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      notifier.notifyActivated(deal, 'manager-1'),
    ).resolves.toBeUndefined();
  });

  it('turns the ask into "schedule made" once a schedule exists', async () => {
    const { notifier, notifications } = build(0);

    await notifier.resolveScheduled(deal, 'Aida');

    expect(notifications.resolveForEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.PAYMENT_SCHEDULE_NEEDED,
        resolvedType: NotificationType.PAYMENT_SCHEDULE_CREATED,
        entityId: 'deal-1',
        templateKey: 'paymentScheduleCreated',
        params: { dealNumber: 'D-2026-0001', byName: 'Aida' },
      }),
    );
  });
});
