import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {AuthUser} from '@/common/types/auth-user.type';
import {HandoverService} from './handover.service';

describe('HandoverService (SH-5)', () => {
    const head: AuthUser = {
        id: 'head-1', email: 'head@crm.dev', name: 'Nurlan Asanova',
        roleId: 'role-sales-head', roleName: 'Sales Head', isBranchScoped: true,
        companyId: 'company-1', company: null, branchId: 'branch-1', branch: null,
        permissions: ['leads.assign', 'deals.reassign'],
    };

    function build() {
        const prisma: any = {
            user: {findFirst: jest.fn().mockResolvedValue({id: 'm-old', fullName: 'Cholpon Isaev', branchId: 'branch-1'})},
            lead: {findMany: jest.fn().mockResolvedValue([{id: 'l1'}, {id: 'l2'}])},
            deal: {findMany: jest.fn().mockResolvedValue([{id: 'd1'}])},
            task: {count: jest.fn().mockResolvedValue(5)},
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        const leads = {bulkReassign: jest.fn().mockResolvedValue({leads: 2, tasks: 1})};
        const deals = {bulkReassign: jest.fn().mockResolvedValue({deals: 1, tasks: 2})};
        const tasks = {handOverOpenTasks: jest.fn().mockResolvedValue([{id: 't9'}])};
        const notifications = {create: jest.fn().mockResolvedValue({})};
        const service = new HandoverService(prisma, leads as any, deals as any, tasks as any, notifications as any);
        return {service, prisma, leads, deals, tasks, notifications};
    }

    it('previews the open leads, active deals and tasks that would move', async () => {
        const {service, prisma} = build();

        await expect(service.preview(head, 'm-old')).resolves.toEqual({
            user: {id: 'm-old', fullName: 'Cholpon Isaev', branchId: 'branch-1'},
            leads: 2, deals: 1, tasks: 5,
        });
        expect(prisma.lead.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
            managerId: 'm-old', branchId: 'branch-1', deletedAt: null,
            status: {in: ['NEW', 'CONTACTED', 'QUALIFIED', 'MEETING', 'NEGOTIATION']},
        }));
        expect(prisma.deal.findMany.mock.calls[0][0].where.status).toEqual({in: ['RESERVED', 'CONTRACT_SIGNED', 'ACTIVE']});
        // The tasks counted are the ones that will move: on those leads and deals, or tied to neither.
        expect(prisma.task.count.mock.calls[0][0].where.OR).toEqual([
            {leadId: null, dealId: null},
            {leadId: {in: ['l1', 'l2']}},
            {dealId: {in: ['d1']}},
        ]);
    });

    it('moves everything through the one-off reassignment rules and sends one summary notification', async () => {
        const {service, leads, deals, tasks, notifications} = build();

        const result = await service.handOver(head, 'm-old', 'm-new');

        expect(leads.bulkReassign).toHaveBeenCalledWith(head, ['l1', 'l2'], 'm-new', {notify: false});
        expect(deals.bulkReassign).toHaveBeenCalledWith(head, ['d1'], 'm-new', {notify: false});
        expect(tasks.handOverOpenTasks).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            link: {standalone: true}, fromUserId: 'm-old', toUserId: 'm-new',
        }));
        expect(result).toEqual({leads: 2, deals: 1, tasks: 4});
        expect(notifications.create).toHaveBeenCalledTimes(1);
        expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'm-new', templateKey: 'workHandedOver',
            params: {fromName: 'Cholpon Isaev', byName: 'Nurlan Asanova', leads: 2, deals: 1, tasks: 4},
        }));
    });

    it('skips the bulk moves that have nothing to move', async () => {
        const {service, prisma, leads, deals} = build();
        prisma.lead.findMany.mockResolvedValue([]);
        prisma.deal.findMany.mockResolvedValue([]);

        await service.handOver(head, 'm-old', 'm-new');

        expect(leads.bulkReassign).not.toHaveBeenCalled();
        expect(deals.bulkReassign).not.toHaveBeenCalled();
    });

    it('refuses handing work to the same person', async () => {
        const {service} = build();
        await expect(service.handOver(head, 'm-old', 'm-old')).rejects.toThrow(BadRequestException);
    });

    it('needs both reassignment permissions', async () => {
        const {service} = build();
        await expect(service.preview({...head, permissions: ['deals.reassign']}, 'm-old')).rejects.toThrow(ForbiddenException);
    });

    it('404s someone outside the Sales Head\'s branch', async () => {
        const {service, prisma} = build();
        prisma.user.findFirst.mockResolvedValue(null);
        await expect(service.preview(head, 'other-branch-user')).rejects.toThrow(NotFoundException);
        expect(prisma.user.findFirst.mock.calls[0][0].where.branchId).toBe('branch-1');
    });
});
