import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UnitStatus} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {FloorsService} from './floors.service';

/**
 * Same family as Blocks/EntrancesService, with its own duplicate() twist:
 * since a floor's identity is a numeric `number` (not a name), the copy
 * probes upward from number+1 until a free floor number is found, rather
 * than appending a "(copy)" suffix. Unit renumbering again continues from
 * the block-wide max, like EntrancesService.
 */
describe('FloorsService', () => {
    const user: AuthUser = {
        id: 'user-1',
        email: 'admin@crm.dev',
        name: 'Admin',
        role: 'COMPANY_ADMIN' as any,
        companyId: 'company-1',
        company: null,
        branchId: null,
        branch: null,
    };

    function build(opts: {
        entrance?: unknown;
        floor?: unknown;
        existingNumber?: unknown;
        lastFloor?: unknown;
        existingNumbers?: {number: number}[];
        allUnits?: {number: string}[];
    } = {}) {
        const prisma = {
            entrance: {findFirst: jest.fn().mockResolvedValue(opts.entrance === undefined ? {id: 'entrance-1', projectId: 'project-1', blockId: 'block-1'} : opts.entrance)},
            floor: {
                findMany: jest.fn().mockResolvedValue(opts.existingNumbers ?? []),
                findFirst: jest.fn().mockImplementation((args: any) => {
                    if (args.orderBy) return Promise.resolve(opts.lastFloor ?? null);
                    if (args.where.number !== undefined) return Promise.resolve(opts.existingNumber ?? null);
                    return Promise.resolve(opts.floor ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'floor-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'floor-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'floor-1'}),
                findUnique: jest.fn().mockResolvedValue({id: 'floor-new'}),
            },
            unit: {
                findMany: jest.fn().mockResolvedValue(opts.allUnits ?? []),
                createMany: jest.fn().mockResolvedValue({count: 0}),
            },
        };

        const service = new FloorsService(prisma as any);
        return {service, prisma};
    }

    describe('create', () => {
        it('rejects an entrance outside the caller company', async () => {
            const {service} = build({entrance: null});
            await expect(service.create(user, 'entrance-1', {number: 1} as any)).rejects.toThrow(BadRequestException);
        });

        it('rejects a duplicate floor number within the same entrance', async () => {
            const {service} = build({existingNumber: {id: 'floor-existing'}});
            await expect(service.create(user, 'entrance-1', {number: 1} as any)).rejects.toThrow(BadRequestException);
        });

        it('auto-increments order from the highest existing floor order', async () => {
            const {service, prisma} = build({lastFloor: {order: 4}});
            await service.create(user, 'entrance-1', {number: 5} as any);

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 5})}),
            );
        });

        it('derives projectId/blockId from the entrance', async () => {
            const {service, prisma} = build({entrance: {id: 'entrance-1', projectId: 'project-9', blockId: 'block-9'}});
            await service.create(user, 'entrance-1', {number: 1} as any);

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({projectId: 'project-9', blockId: 'block-9'})}),
            );
        });
    });

    describe('createBulk', () => {
        it('rejects an entrance outside the caller company', async () => {
            const {service} = build({entrance: null});
            await expect(service.createBulk(user, 'entrance-1', {floors: [{number: 1}]} as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('defaults order to the floor number when order is not given', async () => {
            const {service, prisma} = build();
            await service.createBulk(user, 'entrance-1', {floors: [{number: 5}]} as any);

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: 5, order: 5})}),
            );
        });

        it('honors an explicit order override', async () => {
            const {service, prisma} = build();
            await service.createBulk(user, 'entrance-1', {floors: [{number: 5, order: 99}]} as any);

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 99})}),
            );
        });
    });

    describe('duplicate', () => {
        function sourceFloor(overrides: Record<string, unknown> = {}) {
            return {
                id: 'floor-1',
                number: 3,
                entranceId: 'entrance-1',
                blockId: 'block-1',
                projectId: 'project-1',
                units: [{type: 'APARTMENT', rooms: 2, area: 50, price: 50000}],
                ...overrides,
            };
        }

        it('404s for a floor outside the caller company', async () => {
            const {service} = build({floor: null});
            await expect(service.duplicate(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('picks number+1 when free', async () => {
            const {service, prisma} = build({floor: sourceFloor(), existingNumbers: [{number: 3}]});
            await service.duplicate(user, 'floor-1');

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: 4})}),
            );
        });

        it('probes upward past number+1 until a free floor number is found', async () => {
            const {service, prisma} = build({floor: sourceFloor(), existingNumbers: [{number: 3}, {number: 4}, {number: 5}]});
            await service.duplicate(user, 'floor-1');

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: 6})}),
            );
        });

        it('places the new floor after the highest existing order in the entrance', async () => {
            const {service, prisma} = build({floor: sourceFloor(), lastFloor: {order: 7}});
            await service.duplicate(user, 'floor-1');

            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 8})}),
            );
        });

        it('continues unit numbering from the block-wide highest existing unit number', async () => {
            const {service, prisma} = build({floor: sourceFloor(), allUnits: [{number: '20'}]});
            await service.duplicate(user, 'floor-1');

            const created = (prisma.unit.createMany as jest.Mock).mock.calls[0][0].data;
            expect(created.map((u: any) => u.number)).toEqual(['21']);
            expect(created[0].status).toBe(UnitStatus.AVAILABLE);
        });

        it('skips unit creation when the source floor has no units', async () => {
            const {service, prisma} = build({floor: sourceFloor({units: []})});
            await service.duplicate(user, 'floor-1');

            expect(prisma.unit.createMany).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('404s for a floor outside the caller company', async () => {
            const {service} = build({floor: null});
            await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('rejects deleting a floor with units still attached', async () => {
            const {service} = build({floor: {id: 'floor-1', _count: {units: 1}}});
            await expect(service.remove(user, 'floor-1')).rejects.toThrow(BadRequestException);
        });

        it('deletes a floor with no units', async () => {
            const {service, prisma} = build({floor: {id: 'floor-1', _count: {units: 0}}});
            const result = await service.remove(user, 'floor-1');

            expect(prisma.floor.delete).toHaveBeenCalledWith({where: {id: 'floor-1'}});
            expect(result).toEqual({success: true});
        });
    });
});
