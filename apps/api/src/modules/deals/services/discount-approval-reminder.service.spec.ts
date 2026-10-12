import {DiscountApprovalReminderService} from './discount-approval-reminder.service';

describe('DiscountApprovalReminderService.remindPendingDiscounts', () => {
    const now = new Date('2026-10-12T09:00:00Z');

    function build(opts: {deals?: unknown[]; approvers?: {id: string}[]; recent?: unknown} = {}) {
        const prisma = {
            deal: {findMany: jest.fn().mockResolvedValue(opts.deals ?? [])},
            user: {findMany: jest.fn().mockResolvedValue(opts.approvers ?? [{id: 'head-1'}])},
            notification: {findFirst: jest.fn().mockResolvedValue(opts.recent ?? null)},
        };
        const notifications = {create: jest.fn().mockResolvedValue({})};
        const rbacService = {
            findApproverRoles: jest.fn().mockResolvedValue([
                {id: 'role-sales-head', isBranchScoped: true, discountLimit: 15},
                {id: 'role-company-admin', isBranchScoped: false, discountLimit: null},
            ]),
        };
        const service = new DiscountApprovalReminderService(prisma as any, notifications as any, rbacService as any);
        return {service, prisma, notifications};
    }

    const pending = {
        id: 'deal-1', companyId: 'company-1', branchId: 'branch-1', dealNumber: 'D-2026-0026',
        reservedAt: new Date('2026-10-10T08:00:00Z'), requestedDiscountPercent: 10,
    };

    it('only looks at reservations whose discount request has waited at least a day', async () => {
        const {service, prisma} = build();
        await service.remindPendingDiscounts(now);

        expect(prisma.deal.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                deletedAt: null,
                status: 'RESERVED',
                discountApprovalStatus: 'PENDING',
                reservedAt: {lte: new Date('2026-10-11T09:00:00Z')},
            },
        }));
    });

    it('reminds the branch approvers whose band covers the request, saying how long it has waited', async () => {
        const {service, prisma, notifications} = build({deals: [pending]});
        await service.remindPendingDiscounts(now);

        expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({roleId: {in: ['role-sales-head']}, branchId: 'branch-1'}),
        }));
        expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'head-1',
            type: 'DISCOUNT_APPROVAL_REQUESTED',
            templateKey: 'discountApprovalReminder',
            params: {dealNumber: 'D-2026-0026', percent: 10, days: 2},
            entityType: 'DEAL',
            entityId: 'deal-1',
        }));
    });

    it('does not remind someone already asked about that deal within the last day', async () => {
        const {service, notifications} = build({deals: [pending], recent: {id: 'n-1'}});
        await service.remindPendingDiscounts(now);

        expect(notifications.create).not.toHaveBeenCalled();
    });
});
