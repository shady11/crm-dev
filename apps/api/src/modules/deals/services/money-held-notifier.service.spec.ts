import { Prisma } from '@/generated/prisma/client';
import { MoneyHeldNotifier } from './money-held-notifier.service';

describe('MoneyHeldNotifier', () => {
  const deal = {
    id: 'deal-1',
    companyId: 'company-1',
    dealNumber: 'D-2026-0001',
  };

  function build(
    net: number | null,
    financeUsers = [{ id: 'finance-1' }, { id: 'finance-2' }],
  ) {
    const prisma = {
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({
            _sum: { amount: net === null ? null : new Prisma.Decimal(net) },
          }),
      },
      user: { findMany: jest.fn().mockResolvedValue(financeUsers) },
      company: { findUnique: jest.fn().mockResolvedValue({ currency: 'KGS' }) },
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const rbacService = {
      findRoleIdsWithPermission: jest.fn().mockResolvedValue(['role-finance']),
    };
    const notifier = new MoneyHeldNotifier(
      prisma as any,
      notifications as any,
      rbacService as any,
    );
    return { notifier, prisma, notifications, rbacService };
  }

  it('tells every active Finance user how much a closed deal still holds', async () => {
    const { notifier, prisma, notifications, rbacService } = build(5000);

    await notifier.notifyIfHeld(deal);

    expect(rbacService.findRoleIdsWithPermission).toHaveBeenCalledWith(
      'company-1',
      'dashboard.finance_overview',
    );
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
      companyId: 'company-1',
      roleId: { in: ['role-finance'] },
      isActive: true,
    });
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'finance-1',
        templateKey: 'moneyHeld',
        params: { dealNumber: 'D-2026-0001', amount: 5000, currency: 'KGS' },
        entityId: 'deal-1',
      }),
    );
  });

  it.each([0, null])(
    'stays quiet when nothing is held (net %s)',
    async (net) => {
      const { notifier, notifications, rbacService } = build(net);

      await notifier.notifyIfHeld(deal);

      expect(rbacService.findRoleIdsWithPermission).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    },
  );
});
