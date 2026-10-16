import {BadRequestException, ConflictException, ForbiddenException} from '@nestjs/common';
import {Prisma, UnitPriceRequestStatus} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {UnitPriceRequestsService} from './unit-price-requests.service';

describe('UnitPriceRequestsService (SH-2)', () => {
    const base: AuthUser = {
        id: 'head-1', email: 'head@crm.dev', name: 'Nurlan Asanova',
        roleId: 'role-sales-head', roleName: 'Sales Head', isBranchScoped: true,
        companyId: 'company-1', company: {currency: 'KGS'} as any, branchId: 'branch-1', branch: null,
        permissions: ['units.edit', 'units.edit_price'],
    };
    const admin: AuthUser = {
        ...base, id: 'admin-1', name: 'Admin User', roleId: 'role-admin', roleName: 'Company Admin',
        isBranchScoped: false, branchId: null,
        permissions: ['units.edit', 'units.edit_price', 'units.approve_price'],
    };
    const unit = {id: 'unit-1', number: '504', price: new Prisma.Decimal(56000), project: {name: 'Orion'}};

    function build() {
        const prisma: any = {
            unitPriceRequest: {
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'req-1', ...data})),
                updateMany: jest.fn().mockResolvedValue({count: 1}),
                findFirst: jest.fn(),
                findUniqueOrThrow: jest.fn().mockResolvedValue({
                    id: 'req-1', currentPrice: 56000, requestedPrice: 28000,
                    unit: {id: 'unit-1', number: '504', price: 56000}, requestedBy: null, decidedBy: null,
                }),
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
            },
            unit: {update: jest.fn().mockResolvedValue({})},
            activity: {create: jest.fn().mockResolvedValue({})},
            user: {findMany: jest.fn().mockResolvedValue([{id: 'admin-1'}, {id: 'admin-2'}])},
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        const notifications = {create: jest.fn().mockResolvedValue({}), resolveForEntity: jest.fn().mockResolvedValue(1)};
        const rbac = {findRoleIdsWithPermission: jest.fn().mockResolvedValue(['role-admin'])};
        const service = new UnitPriceRequestsService(prisma, notifications as any, rbac as any);
        return {service, prisma, notifications, rbac};
    }

    describe('unit import (CA-7)', () => {
        it('records the change but sends no per-unit notice when the import asks it not to', async () => {
            const {service, prisma, notifications} = build();
            const result = await service.handlePriceChange(admin, unit, 28000, {notify: false});

            expect(result).toEqual({outcome: 'apply'});
            expect(prisma.unitPriceRequest.create).toHaveBeenCalled();
            expect(notifications.create).not.toHaveBeenCalled();
        });

        it('sends approvers one summary for the file, and says when prices wait for approval', async () => {
            const {service, notifications} = build();
            await service.notifyImportedPrices(base, {projectId: 'project-1', project: 'Orion', updated: 0, requested: 12});

            expect(notifications.create).toHaveBeenCalledTimes(2);
            expect(notifications.create.mock.calls[0][0]).toEqual(expect.objectContaining({
                type: 'UNIT_PRICE_CHANGE_REQUESTED',
                templateKey: 'unitPricesImportRequested',
                params: {project: 'Orion', updated: 0, requested: 12, byName: base.name},
            }));
        });
    });

    describe('handlePriceChange', () => {
        it('refuses someone without units.edit_price', async () => {
            const {service, prisma} = build();
            await expect(service.handlePriceChange({...base, permissions: ['units.edit']}, unit, 28000))
                .rejects.toThrow(ForbiddenException);
            expect(prisma.unitPriceRequest.create).not.toHaveBeenCalled();
        });

        it('turns a Sales Head\'s change into a pending request, replacing any earlier one, and asks the approvers', async () => {
            const {service, prisma, notifications, rbac} = build();

            const result = await service.handlePriceChange(base, unit, 28000);

            expect(result).toEqual({outcome: 'requested', requestId: 'req-1'});
            expect(prisma.unitPriceRequest.updateMany).toHaveBeenCalledWith({
                where: {unitId: 'unit-1', status: UnitPriceRequestStatus.PENDING},
                data: {status: UnitPriceRequestStatus.CANCELLED},
            });
            expect(prisma.unitPriceRequest.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
                currentPrice: 56000, requestedPrice: 28000, requestedById: 'head-1',
            }));
            expect(prisma.activity.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
                unitId: 'unit-1', templateKey: 'unitPriceChangeRequested',
                metadata: {priceRequestId: 'req-1', price: {from: 56000, to: 28000}},
            }));
            expect(rbac.findRoleIdsWithPermission).toHaveBeenCalledWith('company-1', 'units.approve_price');
            expect(notifications.create).toHaveBeenCalledTimes(2);
            expect(notifications.create.mock.calls[0][0]).toEqual(expect.objectContaining({
                userId: 'admin-1', entityType: 'UNIT_PRICE_REQUEST', entityId: 'req-1',
                templateKey: 'unitPriceChangeRequested',
                params: {unit: '504', project: 'Orion', currency: 'KGS', fromPrice: 56000, toPrice: 28000, byName: 'Nurlan Asanova'},
            }));
        });

        it('lets an approver change the price directly, keeps it in the history, and tells the other approvers', async () => {
            const {service, prisma, notifications} = build();

            const result = await service.handlePriceChange(admin, unit, 52000);

            expect(result).toEqual({outcome: 'apply'});
            expect(prisma.unitPriceRequest.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
                status: UnitPriceRequestStatus.APPROVED, requestedById: 'admin-1', decidedById: 'admin-1',
            }));
            expect(prisma.user.findMany.mock.calls[0][0].where.id).toEqual({not: 'admin-1'});
            expect(notifications.create.mock.calls[0][0]).toEqual(expect.objectContaining({
                type: 'UNIT_PRICE_CHANGED', templateKey: 'unitPriceChanged', entityType: 'UNIT', entityId: 'unit-1',
            }));
        });

        it('still saves the change when notifying fails', async () => {
            const {service, notifications} = build();
            notifications.create.mockRejectedValue(new Error('socket down'));
            await expect(service.handlePriceChange(base, unit, 28000)).resolves.toEqual({outcome: 'requested', requestId: 'req-1'});
        });
    });

    describe('approve / reject', () => {
        const pending = {
            id: 'req-1', companyId: 'company-1', unitId: 'unit-1', requestedById: 'head-1',
            status: UnitPriceRequestStatus.PENDING, requestedPrice: new Prisma.Decimal(28000),
            unit: {number: '504', price: new Prisma.Decimal(56000), project: {name: 'Orion'}},
        };

        it('applies the requested price, logs it, and tells the requester and the other approvers', async () => {
            const {service, prisma, notifications} = build();
            prisma.unitPriceRequest.findFirst.mockResolvedValue(pending);

            await service.approve(admin, 'req-1');

            expect(prisma.unitPriceRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {id: 'req-1', status: UnitPriceRequestStatus.PENDING},
                data: expect.objectContaining({status: UnitPriceRequestStatus.APPROVED, decidedById: 'admin-1'}),
            }));
            expect(prisma.unit.update).toHaveBeenCalledWith({where: {id: 'unit-1'}, data: {price: pending.requestedPrice}});
            expect(prisma.activity.create.mock.calls[0][0].data.templateKey).toBe('unitPriceChangeApproved');
            expect(notifications.resolveForEntity).toHaveBeenCalledWith(expect.objectContaining({
                entityId: 'req-1', templateKey: 'unitPriceRequestApproved',
            }));
            expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'head-1', templateKey: 'unitPriceChangeApproved',
            }));
        });

        it('applies nothing when someone else decided first', async () => {
            const {service, prisma} = build();
            prisma.unitPriceRequest.findFirst.mockResolvedValue(pending);
            prisma.unitPriceRequest.updateMany.mockResolvedValue({count: 0});

            await expect(service.approve(admin, 'req-1')).rejects.toThrow(ConflictException);
            expect(prisma.unit.update).not.toHaveBeenCalled();
        });

        it('refuses to decide a request that is no longer pending', async () => {
            const {service, prisma} = build();
            prisma.unitPriceRequest.findFirst.mockResolvedValue({...pending, status: UnitPriceRequestStatus.APPROVED});
            await expect(service.reject(admin, 'req-1', 'too low')).rejects.toThrow(ConflictException);
        });

        it('needs a reason to reject, keeps the price, and tells the requester why', async () => {
            const {service, prisma, notifications} = build();
            prisma.unitPriceRequest.findFirst.mockResolvedValue(pending);

            await expect(service.reject(admin, 'req-1', '  ')).rejects.toThrow(BadRequestException);

            await service.reject(admin, 'req-1', 'Below cost');
            expect(prisma.unit.update).not.toHaveBeenCalled();
            expect(prisma.unitPriceRequest.updateMany.mock.calls[0][0].data).toEqual(expect.objectContaining({
                status: UnitPriceRequestStatus.REJECTED, rejectionReason: 'Below cost',
            }));
            expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'head-1', templateKey: 'unitPriceChangeRejected',
                params: expect.objectContaining({reason: 'Below cost'}),
            }));
        });
    });

    describe('findAll', () => {
        it('shows an approver every request but cancelled ones, pending first', async () => {
            const {service, prisma} = build();
            await service.findAll(admin, {});
            const args = prisma.unitPriceRequest.findMany.mock.calls[0][0];
            expect(args.where).toEqual({companyId: 'company-1', status: {not: UnitPriceRequestStatus.CANCELLED}});
            expect(args.orderBy).toEqual([{status: 'asc'}, {createdAt: 'desc'}]);
        });

        it('shows someone who can only ask just their own requests', async () => {
            const {service, prisma} = build();
            await service.findAll(base, {status: UnitPriceRequestStatus.PENDING});
            expect(prisma.unitPriceRequest.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
                status: UnitPriceRequestStatus.PENDING, requestedById: 'head-1',
            }));
        });
    });
});
