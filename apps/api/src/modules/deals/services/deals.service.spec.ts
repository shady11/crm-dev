import {BadRequestException} from '@nestjs/common';
import {
    DealStatus,
    DiscountApprovalStatus,
    PaymentScheduleStatus,
    Prisma,
    UnitStatus,
    UserRole,
} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {DealsService} from './deals.service';
import {DealDomainService} from './deal-domain.service';
import {
    ActiveDealExistsException,
    ClientNotFoundException,
    DealNotFoundException,
    DiscountApprovalNotAllowedException,
    DiscountNotPendingException,
    SalePriceMismatchException,
    UnitNotAvailableException,
    UnitNotFoundException,
} from '../exceptions';
import {DealMapper} from '../mappers/deal.mapper';

/**
 * DealsService is the widest surface in the module: unit reservation with
 * its discount-approval-threshold routing and sale-price integrity check,
 * every status transition (each independently guarded by DealDomainService,
 * used here for real rather than mocked), discount approve/reject
 * authorization, cancellation's unit-release and schedule-cleanup side
 * effects, and completion eligibility.
 */
describe('DealsService', () => {
    const managerUser: AuthUser = {
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
        ...managerUser,
        id: 'admin-1',
        role: UserRole.COMPANY_ADMIN,
        branchId: null,
    };

    const salesHeadUser: AuthUser = {
        ...managerUser,
        id: 'head-1',
        role: UserRole.SALES_HEAD,
    };

    const company = (overrides: Record<string, unknown> = {}) => ({
        id: 'company-1',
        salesManagerDiscountLimit: new Prisma.Decimal(5),
        salesHeadDiscountLimit: new Prisma.Decimal(15),
        ...overrides,
    });

    function buildBase() {
        const prisma: any = {
            unit: {findFirst: jest.fn(), update: jest.fn().mockResolvedValue({})},
            deal: {
                findFirst: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn(),
                update: jest.fn().mockResolvedValue({}),
                findUniqueOrThrow: jest.fn().mockImplementation(({where}: any) => Promise.resolve({id: where.id})),
                groupBy: jest.fn().mockResolvedValue([]),
            },
            client: {findFirst: jest.fn()},
            user: {findFirstOrThrow: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([])},
            company: {findUniqueOrThrow: jest.fn().mockResolvedValue(company())},
            payment: {create: jest.fn().mockResolvedValue({}), aggregate: jest.fn().mockResolvedValue({_sum: {amount: null}})},
            paymentSchedule: {findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({count: 0})},
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };

        const mapper = {toDetails: jest.fn((d: unknown) => d), toList: jest.fn((d: unknown) => d)} as unknown as DealMapper;
        const domain = new DealDomainService();
        const activityService = {
            reserve: jest.fn().mockResolvedValue({}),
            extendReservation: jest.fn().mockResolvedValue({}),
            cancelReservation: jest.fn().mockResolvedValue({}),
            signContract: jest.fn().mockResolvedValue({}),
            dealUpdated: jest.fn().mockResolvedValue({}),
            reassignManager: jest.fn().mockResolvedValue({}),
            documentGenerated: jest.fn().mockResolvedValue({}),
            discountRequested: jest.fn().mockResolvedValue({}),
            discountApproved: jest.fn().mockResolvedValue({}),
            discountRejected: jest.fn().mockResolvedValue({}),
        };
        const notifications = {create: jest.fn().mockResolvedValue({})};
        const dealNumberService = {generateDealNumber: jest.fn().mockResolvedValue('2026-0001')};
        const documentGeneration = {generateForDeal: jest.fn().mockResolvedValue({id: 'doc-1'})};

        const service = new DealsService(
            prisma, mapper, domain, activityService as any, notifications as any,
            dealNumberService as any, documentGeneration as any,
        );

        return {service, prisma, activityService, notifications, dealNumberService, documentGeneration};
    }

    describe('reserveUnit', () => {
        const reserveDto = (overrides: Record<string, unknown> = {}) => ({
            unitId: 'unit-1',
            clientId: 'client-1',
            salePrice: 100000,
            ...overrides,
        }) as any;

        function build(opts: {unit?: unknown; client?: unknown; activeDeal?: unknown; company?: unknown} = {}) {
            const b = buildBase();
            b.prisma.unit.findFirst.mockResolvedValue(
                opts.unit === undefined
                    ? {id: 'unit-1', price: new Prisma.Decimal(100000), status: UnitStatus.AVAILABLE, projectId: 'p1', number: '101'}
                    : opts.unit,
            );
            b.prisma.client.findFirst.mockResolvedValue(
                opts.client === undefined ? {id: 'client-1', branchId: 'branch-1'} : opts.client,
            );
            b.prisma.user.findFirstOrThrow.mockResolvedValue({id: 'manager-1', branchId: 'branch-1'});
            b.prisma.deal.findFirst.mockResolvedValue(opts.activeDeal ?? null);
            b.prisma.deal.create.mockImplementation(({data}: any) => Promise.resolve({id: 'deal-1', ...data}));
            if (opts.company) b.prisma.company.findUniqueOrThrow.mockResolvedValue(opts.company);
            return b;
        }

        it('throws UnitNotFoundException when the unit is missing or outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.reserveUnit(managerUser, reserveDto())).rejects.toThrow(UnitNotFoundException);
        });

        it('throws ClientNotFoundException when the client is outside caller scope', async () => {
            const {service} = build({client: null});
            await expect(service.reserveUnit(managerUser, reserveDto())).rejects.toThrow(ClientNotFoundException);
        });

        it('throws UnitNotAvailableException when the unit is not AVAILABLE', async () => {
            const {service} = build({unit: {id: 'unit-1', price: new Prisma.Decimal(100000), status: UnitStatus.RESERVED, projectId: 'p1', number: '101'}});
            await expect(service.reserveUnit(managerUser, reserveDto())).rejects.toThrow(UnitNotAvailableException);
        });

        it('throws ActiveDealExistsException when the unit already has an active deal', async () => {
            const {service} = build({activeDeal: {id: 'other-deal'}});
            await expect(service.reserveUnit(managerUser, reserveDto())).rejects.toThrow(ActiveDealExistsException);
        });

        it('throws SalePriceMismatchException when the submitted price disagrees with the computed one', async () => {
            const {service} = build();
            await expect(service.reserveUnit(managerUser, reserveDto({salePrice: 50000}))).rejects.toThrow(
                SalePriceMismatchException,
            );
        });

        it('accepts a matching sale price with no discount and creates the deal ACTIVE at that price with no approval required', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({salePrice: 100000}));

            const createArgs = prisma.deal.create.mock.calls[0][0].data;
            expect(createArgs.salePrice.toString()).toBe('100000');
            expect(createArgs.discountApprovalStatus).toBe(DiscountApprovalStatus.NONE);
            expect(createArgs.status).toBe(DealStatus.RESERVED);
        });

        it('computes discount amount from discountPercent and requires approval once it exceeds the acting role limit', async () => {
            const {service, prisma} = build();
            // SALES_MANAGER limit is 5%; 10% must go to approval.
            await service.reserveUnit(managerUser, reserveDto({discountPercent: 10, salePrice: 90000}));

            const createArgs = prisma.deal.create.mock.calls[0][0].data;
            expect(createArgs.discountApprovalStatus).toBe(DiscountApprovalStatus.PENDING);
            // Held at list price while pending.
            expect(createArgs.salePrice.toString()).toBe('100000');
            expect(createArgs.requestedDiscountPercent.toString()).toBe('10');
            expect(createArgs.requestedDiscountAmount.toString()).toBe('10000');
        });

        it('allows a discount within the acting role limit without requiring approval', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({discountPercent: 5, salePrice: 95000}));

            const createArgs = prisma.deal.create.mock.calls[0][0].data;
            expect(createArgs.discountApprovalStatus).toBe(DiscountApprovalStatus.NONE);
            expect(createArgs.salePrice.toString()).toBe('95000');
        });

        it('derives the deal branchId from the client, not from the acting user', async () => {
            const {service, prisma} = build({client: {id: 'client-1', branchId: 'branch-9'}});
            await service.reserveUnit(adminUser, reserveDto({salePrice: 100000}));

            expect(prisma.deal.create.mock.calls[0][0].data.branchId).toBe('branch-9');
        });

        it('records an initial deposit payment when a deposit is given', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({salePrice: 100000, deposit: 5000}));

            expect(prisma.payment.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({amount: 5000, dealId: 'deal-1'})}),
            );
        });

        it('skips the deposit payment when none is given', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({salePrice: 100000}));

            expect(prisma.payment.create).not.toHaveBeenCalled();
        });

        it('flips the unit to RESERVED', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({salePrice: 100000}));

            expect(prisma.unit.update).toHaveBeenCalledWith({where: {id: 'unit-1'}, data: {status: UnitStatus.RESERVED}});
        });

        it('routes discount-approval notifications to SALES_HEADs on the branch when within their band', async () => {
            const {service, prisma} = build();
            prisma.user.findMany.mockResolvedValue([{id: 'head-1'}, {id: 'head-2'}]);

            // 10% is above the SALES_MANAGER limit (5%) but within the SALES_HEAD limit (15%).
            await service.reserveUnit(managerUser, reserveDto({discountPercent: 10, salePrice: 90000}));

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({role: UserRole.SALES_HEAD, branchId: 'branch-1'})}),
            );
        });

        it('routes discount-approval notifications to COMPANY_ADMINs once above the sales head band', async () => {
            const {service, prisma} = build();
            prisma.user.findMany.mockResolvedValue([{id: 'admin-1'}]);

            // 20% is above even the SALES_HEAD limit (15%).
            await service.reserveUnit(managerUser, reserveDto({discountPercent: 20, salePrice: 80000}));

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({role: UserRole.COMPANY_ADMIN})}),
            );
        });

        it('never queries approvers when no approval is required', async () => {
            const {service, prisma} = build();
            await service.reserveUnit(managerUser, reserveDto({salePrice: 100000}));

            expect(prisma.user.findMany).not.toHaveBeenCalled();
        });
    });

    describe('extendReservation', () => {
        it('throws DealNotFoundException outside caller scope', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(null);
            await expect(service.extendReservation(managerUser, 'deal-1', {reservationExpiresAt: new Date(Date.now() + 60000).toISOString()} as any)).rejects.toThrow(DealNotFoundException);
        });

        it('rejects extending a deal that is not RESERVED', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, reservationExpiresAt: null});
            await expect(
                service.extendReservation(managerUser, 'deal-1', {reservationExpiresAt: new Date(Date.now() + 60000).toISOString()} as any),
            ).rejects.toThrow();
        });

        it('updates reservationExpiresAt on success', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.RESERVED, reservationExpiresAt: null, clientId: 'c1'});
            const newExpiry = new Date(Date.now() + 60000).toISOString();

            await service.extendReservation(managerUser, 'deal-1', {reservationExpiresAt: newExpiry} as any);

            expect(prisma.deal.update).toHaveBeenCalledWith({
                where: {id: 'deal-1'},
                data: {reservationExpiresAt: new Date(newExpiry)},
            });
        });
    });

    describe('signContract', () => {
        it('throws DealNotFoundException outside caller scope', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(null);
            await expect(service.signContract(managerUser, 'deal-1', {contractNumber: 'C1', contractDate: new Date().toISOString()} as any)).rejects.toThrow(DealNotFoundException);
        });

        it('rejects signing a deal that is not RESERVED', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, discountApprovalStatus: DiscountApprovalStatus.NONE});
            await expect(
                service.signContract(managerUser, 'deal-1', {contractNumber: 'C1', contractDate: new Date().toISOString()} as any),
            ).rejects.toThrow();
        });

        it('rejects signing while a discount request is still PENDING', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.RESERVED, discountApprovalStatus: DiscountApprovalStatus.PENDING});
            await expect(
                service.signContract(managerUser, 'deal-1', {contractNumber: 'C1', contractDate: new Date().toISOString()} as any),
            ).rejects.toThrow();
        });

        it('moves the deal to CONTRACT_SIGNED and notifies the manager', async () => {
            const {service, prisma, notifications} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({
                id: 'deal-1', status: DealStatus.RESERVED, discountApprovalStatus: DiscountApprovalStatus.NONE,
                managerId: 'manager-1', clientId: 'c1', dealNumber: '2026-0001', note: null,
            });

            await service.signContract(managerUser, 'deal-1', {contractNumber: 'C1', contractDate: new Date().toISOString()} as any);

            expect(prisma.deal.update).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({status: DealStatus.CONTRACT_SIGNED})}),
            );
            expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({userId: 'manager-1'}));
        });
    });

    describe('activate', () => {
        it('rejects activating a deal that is not CONTRACT_SIGNED', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.RESERVED});
            await expect(service.activate(managerUser, 'deal-1')).rejects.toThrow();
        });

        it('moves the deal to ACTIVE', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.CONTRACT_SIGNED, managerId: null, clientId: 'c1', dealNumber: '2026-0001'});

            await service.activate(managerUser, 'deal-1');

            expect(prisma.deal.update).toHaveBeenCalledWith(
                expect.objectContaining({data: {status: DealStatus.ACTIVE}}),
            );
        });
    });

    describe('approveDiscount / rejectDiscount', () => {
        function pendingDeal(overrides: Record<string, unknown> = {}) {
            return {
                id: 'deal-1',
                discountApprovalStatus: DiscountApprovalStatus.PENDING,
                requestedDiscountPercent: new Prisma.Decimal(10),
                requestedDiscountAmount: new Prisma.Decimal(10000),
                listPrice: new Prisma.Decimal(100000),
                managerId: 'manager-1',
                clientId: 'c1',
                dealNumber: '2026-0001',
                ...overrides,
            };
        }

        it('approveDiscount: rejects when the deal has no pending discount request', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal({discountApprovalStatus: DiscountApprovalStatus.NONE}));
            await expect(service.approveDiscount(adminUser, 'deal-1')).rejects.toThrow(DiscountNotPendingException);
        });

        it('approveDiscount: rejects a SALES_HEAD approving a request above their own band', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal({requestedDiscountPercent: new Prisma.Decimal(20)}));
            await expect(service.approveDiscount(salesHeadUser, 'deal-1')).rejects.toThrow(DiscountApprovalNotAllowedException);
        });

        it('approveDiscount: a SALES_HEAD may approve a request within their own band', async () => {
            const {service} = buildBase();
            const b = buildBase();
            b.prisma.deal.findFirst.mockResolvedValue(pendingDeal());
            await expect(b.service.approveDiscount(salesHeadUser, 'deal-1')).resolves.toBeDefined();
        });

        it('approveDiscount: recomputes salePrice from listPrice minus the requested discount amount', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal());

            await service.approveDiscount(adminUser, 'deal-1');

            const data = prisma.deal.update.mock.calls[0][0].data;
            expect(data.discountApprovalStatus).toBe(DiscountApprovalStatus.APPROVED);
            expect(data.salePrice.toString()).toBe('90000');
        });

        it('approveDiscount: notifies the manager unless the approver is the manager themselves', async () => {
            const {service, prisma, notifications} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal({managerId: 'admin-1'}));

            await service.approveDiscount(adminUser, 'deal-1');
            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('rejectDiscount: rejects when the deal has no pending discount request', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal({discountApprovalStatus: DiscountApprovalStatus.APPROVED}));
            await expect(service.rejectDiscount(adminUser, 'deal-1', {reason: 'too high'} as any)).rejects.toThrow(
                DiscountNotPendingException,
            );
        });

        it('rejectDiscount: sets REJECTED status with the given reason and never touches salePrice', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(pendingDeal());

            await service.rejectDiscount(adminUser, 'deal-1', {reason: 'too high'} as any);

            const data = prisma.deal.update.mock.calls[0][0].data;
            expect(data.discountApprovalStatus).toBe(DiscountApprovalStatus.REJECTED);
            expect(data.discountRejectionReason).toBe('too high');
            expect(data.salePrice).toBeUndefined();
        });
    });

    describe('reassignManager', () => {
        it('rejects when the deal is not assigned to a branch', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', branchId: null});
            await expect(service.reassignManager(salesHeadUser, 'deal-1', {managerId: 'new-manager'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('rejects a target who is not an active SALES_MANAGER on the same branch', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', branchId: 'branch-1'});
            prisma.user.findFirst.mockResolvedValue(null);
            await expect(service.reassignManager(salesHeadUser, 'deal-1', {managerId: 'new-manager'} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('reassigns and records the from/to manager ids', async () => {
            const {service, prisma, activityService} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', branchId: 'branch-1', managerId: 'old-manager', clientId: 'c1'});
            prisma.user.findFirst.mockResolvedValue({id: 'new-manager', role: UserRole.SALES_MANAGER, isActive: true});

            await service.reassignManager(salesHeadUser, 'deal-1', {managerId: 'new-manager'} as any);

            expect(prisma.deal.update).toHaveBeenCalledWith({where: {id: 'deal-1'}, data: {managerId: 'new-manager'}});
            expect(activityService.reassignManager).toHaveBeenCalledWith(
                expect.objectContaining({metadata: {fromManagerId: 'old-manager', toManagerId: 'new-manager'}}),
            );
        });
    });

    describe('cancelDeal', () => {
        it('rejects cancelling a deal already in a finished state', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.COMPLETED});
            await expect(service.cancelDeal(managerUser, 'deal-1', {} as any)).rejects.toThrow();
        });

        it('releases the unit back to AVAILABLE', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, unitId: 'unit-1', managerId: null, clientId: 'c1', dealNumber: '2026-0001'});

            await service.cancelDeal(managerUser, 'deal-1', {reason: 'client backed out'} as any);

            expect(prisma.unit.update).toHaveBeenCalledWith({where: {id: 'unit-1'}, data: {status: UnitStatus.AVAILABLE}});
        });

        it('soft-deletes only outstanding (PENDING/PARTIAL/OVERDUE) payment schedules', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, unitId: 'unit-1', managerId: null, clientId: 'c1', dealNumber: '2026-0001'});

            await service.cancelDeal(managerUser, 'deal-1', {} as any);

            expect(prisma.paymentSchedule.updateMany).toHaveBeenCalledWith({
                where: {
                    dealId: 'deal-1',
                    deletedAt: null,
                    status: {in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL, PaymentScheduleStatus.OVERDUE]},
                },
                data: {deletedAt: expect.any(Date)},
            });
        });

        it('records the cancellation reason and cancelledAt', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.RESERVED, unitId: 'unit-1', managerId: null, clientId: 'c1', dealNumber: '2026-0001'});

            await service.cancelDeal(managerUser, 'deal-1', {reason: 'client backed out'} as any);

            expect(prisma.deal.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({status: DealStatus.CANCELLED, cancelReason: 'client backed out'}),
                }),
            );
        });
    });

    describe('complete / tryCompleteWithinTransaction', () => {
        it('throws DealNotFoundException when eligibility checking is asked to throw and the deal is out of scope', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(null);
            await expect(service.complete(managerUser, 'deal-1')).rejects.toThrow(DealNotFoundException);
        });

        it('silently returns false (no throw) when called without throwOnIneligible and the deal is unpaid', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000), unitId: 'unit-1', managerId: null, clientId: 'c1', dealNumber: '2026-0001', companyId: 'company-1'});
            prisma.payment.aggregate.mockResolvedValue({_sum: {amount: new Prisma.Decimal(0)}});

            const result = await service.tryCompleteWithinTransaction(prisma, managerUser, 'deal-1', false);
            expect(result).toBe(false);
            expect(prisma.deal.update).not.toHaveBeenCalled();
        });

        it('throws when throwOnIneligible is true and the deal is not fully paid', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000), unitId: 'unit-1', managerId: null, clientId: 'c1', dealNumber: '2026-0001', companyId: 'company-1'});
            prisma.payment.aggregate.mockResolvedValue({_sum: {amount: new Prisma.Decimal(0)}});

            await expect(service.complete(managerUser, 'deal-1')).rejects.toThrow();
        });

        it('marks the deal COMPLETED and the unit SOLD once fully paid with every schedule PAID', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1', status: DealStatus.ACTIVE, salePrice: new Prisma.Decimal(1000), unitId: 'unit-1', managerId: 'manager-1', clientId: 'c1', dealNumber: '2026-0001', companyId: 'company-1'});
            prisma.payment.aggregate.mockResolvedValue({_sum: {amount: new Prisma.Decimal(1000)}});
            prisma.paymentSchedule.findMany.mockResolvedValue([{status: PaymentScheduleStatus.PAID}]);

            await service.complete(managerUser, 'deal-1');

            expect(prisma.deal.update).toHaveBeenCalledWith(
                expect.objectContaining({data: {status: DealStatus.COMPLETED}}),
            );
            expect(prisma.unit.update).toHaveBeenCalledWith({where: {id: 'unit-1'}, data: {status: UnitStatus.SOLD}});
        });
    });

    describe('findAll / findOne', () => {
        it('scopes findAll to the branch for branch-scoped roles', async () => {
            const {service, prisma} = buildBase();
            await service.findAll(managerUser, {});

            expect(prisma.deal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({companyId: 'company-1', branchId: 'branch-1'})}),
            );
        });

        it('findOne throws DealNotFoundException outside caller scope', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue(null);
            await expect(service.findOne(managerUser, 'missing')).rejects.toThrow(DealNotFoundException);
        });
    });

    describe('generateDocument', () => {
        it('rejects a document type that cannot be generated on demand', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.findFirst.mockResolvedValue({id: 'deal-1'});
            await expect(service.generateDocument(managerUser, 'deal-1', 'INVOICE' as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('getStatusSummary', () => {
        it('fills every DealStatus with a zero count when groupBy omits it', async () => {
            const {service, prisma} = buildBase();
            prisma.deal.groupBy.mockResolvedValue([{status: DealStatus.ACTIVE, _count: {_all: 4}}]);

            const summary = await service.getStatusSummary(adminUser);

            expect(summary).toEqual(
                Object.values(DealStatus).map(status => ({status, count: status === DealStatus.ACTIVE ? 4 : 0})),
            );
        });

        it('scopes branch-scoped roles to their own branch, ignoring a passed branchId', async () => {
            const {service, prisma} = buildBase();
            await service.getStatusSummary(managerUser, undefined, 'other-branch');

            expect(prisma.deal.groupBy).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({branchId: 'branch-1'})}),
            );
        });
    });
});
