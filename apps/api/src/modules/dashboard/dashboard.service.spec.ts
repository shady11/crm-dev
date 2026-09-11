import {ForbiddenException} from '@nestjs/common';
import * as XLSX from 'xlsx';
import {DealStatus, LeadStatus, UnitStatus, UserRole} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {DashboardService} from './dashboard.service';

/**
 * DashboardService is read-only aggregation, but three things are worth
 * pinning down independently of the Prisma calls themselves: branch
 * resolution (a branch-scoped role is always pinned to their own branch,
 * never the query param — BR-B1), that units stay company-wide even for a
 * branch-scoped viewer (BR-C1), and every division (conversion rates) is
 * guarded against a zero denominator.
 */
describe('DashboardService', () => {
    const branchUser: AuthUser = {
        id: 'manager-1',
        email: 'manager@crm.dev',
        name: 'Manager',
        role: UserRole.SALES_MANAGER,
        companyId: 'company-1',
        company: null,
        branchId: 'branch-1',
        branch: null,
    };

    const adminUser: AuthUser = {
        ...branchUser,
        id: 'admin-1',
        role: UserRole.COMPANY_ADMIN,
        branchId: null,
    };

    const salesHeadUser: AuthUser = {...branchUser, id: 'head-1', role: UserRole.SALES_HEAD};

    function build() {
        const prisma = {
            payment: {
                aggregate: jest.fn().mockResolvedValue({_sum: {amount: null}}),
                findMany: jest.fn().mockResolvedValue([]),
            },
            deal: {
                count: jest.fn().mockResolvedValue(0),
                findMany: jest.fn().mockResolvedValue([]),
                groupBy: jest.fn().mockResolvedValue([]),
            },
            unit: {groupBy: jest.fn().mockResolvedValue([])},
            task: {count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([])},
            activity: {findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null)},
            branch: {findMany: jest.fn().mockResolvedValue([])},
            user: {findMany: jest.fn().mockResolvedValue([])},
            lead: {count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([])},
        };

        const service = new DashboardService(prisma as any);
        return {service, prisma};
    }

    describe('branch resolution (via getKpis)', () => {
        it('pins a branch-scoped role to their own branch, ignoring any passed branchId', async () => {
            const {service, prisma} = build();
            await service.getKpis(branchUser, undefined, 'other-branch');

            expect(prisma.deal.count).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-1'})}),
            );
        });

        it('lets a company-wide role narrow to the given branchId', async () => {
            const {service, prisma} = build();
            await service.getKpis(adminUser, undefined, 'branch-9');

            expect(prisma.deal.count).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-9'})}),
            );
        });

        it('never filters the units query by branch, even for a branch-scoped viewer', async () => {
            const {service, prisma} = build();
            await service.getKpis(branchUser);

            const where = (prisma.unit.groupBy as jest.Mock).mock.calls[0][0].where;
            expect(where.branchId).toBeUndefined();
        });
    });

    describe('getKpis', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.getKpis({...adminUser, companyId: null})).rejects.toThrow(ForbiddenException);
        });

        it('defaults revenue to 0 when there are no payments this month', async () => {
            const {service} = build();
            const result = await service.getKpis(adminUser);
            expect(result.revenueThisMonth).toBe(0);
        });

        it('derives availableUnits and totalUnits from the status groupBy', async () => {
            const {service, prisma} = build();
            prisma.unit.groupBy.mockResolvedValue([
                {status: UnitStatus.AVAILABLE, _count: {_all: 7}},
                {status: UnitStatus.SOLD, _count: {_all: 3}},
            ]);

            const result = await service.getKpis(adminUser);

            expect(result.availableUnits).toBe(7);
            expect(result.totalUnits).toBe(10);
        });
    });

    describe('getRevenueTrend', () => {
        it('buckets payments into their payment month, summed', async () => {
            const {service, prisma} = build();
            const thisMonth = new Date();
            prisma.payment.findMany.mockResolvedValue([
                {amount: 100, paidAt: thisMonth},
                {amount: 250, paidAt: thisMonth},
            ]);

            const result = await service.getRevenueTrend(adminUser);
            const key = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
            expect(result.find((r) => r.month === key)?.revenue).toBe(350);
        });

        it('always returns exactly 6 month buckets, even with no payments', async () => {
            const {service} = build();
            const result = await service.getRevenueTrend(adminUser);
            expect(result).toHaveLength(6);
            expect(result.every((r) => r.revenue === 0)).toBe(true);
        });
    });

    describe('getUnitsSummary', () => {
        it('fills every UnitStatus with a zero count when the groupBy omits it', async () => {
            const {service, prisma} = build();
            prisma.unit.groupBy.mockResolvedValue([{status: UnitStatus.SOLD, _count: {_all: 2}}]);

            const result = await service.getUnitsSummary(adminUser);

            expect(result).toEqual(
                Object.values(UnitStatus).map((status) => ({status, count: status === UnitStatus.SOLD ? 2 : 0})),
            );
        });
    });

    describe('getBranchComparison', () => {
        it('includes a branch with zero deals and zero revenue', async () => {
            const {service, prisma} = build();
            prisma.branch.findMany.mockResolvedValue([{id: 'branch-1', name: 'HQ'}]);
            prisma.deal.groupBy.mockResolvedValue([]);
            prisma.payment.aggregate.mockResolvedValue({_sum: {amount: null}});

            const result = await service.getBranchComparison(adminUser);

            expect(result).toEqual([{branchId: 'branch-1', branchName: 'HQ', dealCount: 0, revenue: 0}]);
        });

        it('matches each branch to its own deal count and revenue', async () => {
            const {service, prisma} = build();
            prisma.branch.findMany.mockResolvedValue([{id: 'b1', name: 'A'}, {id: 'b2', name: 'B'}]);
            prisma.deal.groupBy.mockResolvedValue([{branchId: 'b1', _count: {_all: 4}}]);
            prisma.payment.aggregate.mockImplementation(({where}: any) =>
                Promise.resolve({_sum: {amount: where.deal.branchId === 'b1' ? 5000 : 0}}),
            );

            const result = await service.getBranchComparison(adminUser);

            expect(result).toEqual([
                {branchId: 'b1', branchName: 'A', dealCount: 4, revenue: 5000},
                {branchId: 'b2', branchName: 'B', dealCount: 0, revenue: 0},
            ]);
        });
    });

    describe('getTeamSnapshot', () => {
        it('rejects a SALES_HEAD not assigned to a branch', async () => {
            const {service} = build();
            await expect(service.getTeamSnapshot({...salesHeadUser, branchId: null})).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('returns one row per active SALES_MANAGER on the branch, with a null lastActivityAt when none exists', async () => {
            const {service, prisma} = build();
            prisma.user.findMany.mockResolvedValue([{id: 'm1', fullName: 'Manager One', email: 'm1@crm.dev'}]);

            const result = await service.getTeamSnapshot(salesHeadUser);

            expect(result).toEqual([
                expect.objectContaining({manager: {id: 'm1', fullName: 'Manager One', email: 'm1@crm.dev'}, lastActivityAt: null}),
            ]);
        });
    });

    describe('getMyPerformance', () => {
        it('reports a zero conversion rate when no leads were assigned, instead of dividing by zero', async () => {
            const {service, prisma} = build();
            prisma.lead.count.mockResolvedValue(0);

            const result = await service.getMyPerformance(adminUser, 30);
            expect(result.conversionRate).toBe(0);
        });

        it('computes dealsWon / leadsAssigned when leads exist', async () => {
            const {service, prisma} = build();
            prisma.lead.count.mockResolvedValue(10);
            prisma.deal.count.mockResolvedValueOnce(6).mockResolvedValueOnce(3);

            const result = await service.getMyPerformance(adminUser, 30);
            expect(result.conversionRate).toBe(0.3);
        });

        it('scopes every count to the acting manager themself, not a query param', async () => {
            const {service, prisma} = build();
            await service.getMyPerformance(adminUser, 30);

            expect(prisma.lead.count).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({managerId: 'admin-1'})}),
            );
        });
    });

    describe('getFunnel', () => {
        it('reports zero conversion rates when there are no leads at all', async () => {
            const {service, prisma} = build();
            prisma.lead.count.mockResolvedValue(0);

            const result = await service.getFunnel(adminUser);
            expect(result.leadToDealConversionRate).toBe(0);
            expect(result.leadToWonConversionRate).toBe(0);
        });

        it('computes conversion rates against total leads', async () => {
            const {service, prisma} = build();
            prisma.lead.count.mockResolvedValue(20);
            prisma.deal.groupBy.mockResolvedValue([
                {status: DealStatus.ACTIVE, _count: {_all: 5}},
                {status: DealStatus.COMPLETED, _count: {_all: 2}},
            ]);
            prisma.deal.count.mockResolvedValue(2);

            const result = await service.getFunnel(adminUser);

            expect(result.totalDeals).toBe(7);
            expect(result.leadToDealConversionRate).toBe(7 / 20);
            expect(result.leadToWonConversionRate).toBe(2 / 20);
        });

        it('fills every LeadStatus and DealStatus with zero when absent from the groupBy', async () => {
            const {service, prisma} = build();
            prisma.lead.count.mockResolvedValue(1);

            const result = await service.getFunnel(adminUser);

            expect(result.leadsByStatus).toHaveLength(Object.values(LeadStatus).length);
            expect(result.dealsByStatus).toHaveLength(Object.values(DealStatus).length);
            expect(result.leadsByStatus.every((r) => r.count === 0)).toBe(true);
        });
    });

    describe('exportFunnelXlsx', () => {
        it('produces a non-empty xlsx buffer built from the funnel', async () => {
            const {service} = build();
            const buffer = await service.exportFunnelXlsx(adminUser);

            expect(Buffer.isBuffer(buffer)).toBe(true);
            expect(buffer.length).toBeGreaterThan(0);

            const workbook = XLSX.read(buffer, {type: 'buffer'});
            expect(workbook.SheetNames).toEqual(['Leads by status', 'Deals by status', 'Summary']);
        });
    });
});
