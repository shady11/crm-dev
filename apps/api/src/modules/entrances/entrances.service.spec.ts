import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UnitStatus} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {EntrancesService} from './entrances.service';

/**
 * Same shape as BlocksService, with one deliberate difference in
 * duplicate(): units cloned here are renumbered from the block's existing
 * MAX unit number + 1 (like UnitsService.duplicate), not restarted at 1 —
 * because unlike a whole new block, a duplicated entrance's units still
 * share a block-number namespace with the original entrance's units.
 */
describe('EntrancesService', () => {
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
        block?: unknown;
        entrance?: unknown;
        existingName?: unknown;
        lastEntrance?: unknown;
        existingNames?: {name: string}[];
        allUnits?: {number: string}[];
    } = {}) {
        const prisma = {
            block: {findFirst: jest.fn().mockResolvedValue(opts.block === undefined ? {id: 'block-1', projectId: 'project-1'} : opts.block)},
            entrance: {
                findMany: jest.fn().mockResolvedValue(opts.existingNames ?? []),
                findFirst: jest.fn().mockImplementation((args: any) => {
                    if (args.orderBy) return Promise.resolve(opts.lastEntrance ?? null);
                    if (args.where.name !== undefined) return Promise.resolve(opts.existingName ?? null);
                    return Promise.resolve(opts.entrance ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'entrance-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'entrance-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'entrance-1'}),
                findUnique: jest.fn().mockResolvedValue({id: 'entrance-new'}),
            },
            floor: {create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'floor-new', ...data}))},
            unit: {
                findMany: jest.fn().mockResolvedValue(opts.allUnits ?? []),
                createMany: jest.fn().mockResolvedValue({count: 0}),
            },
        };

        const service = new EntrancesService(prisma as any);
        return {service, prisma};
    }

    describe('create', () => {
        it('rejects a block outside the caller company', async () => {
            const {service} = build({block: null});
            await expect(service.create(user, 'block-1', {name: '1'} as any)).rejects.toThrow(BadRequestException);
        });

        it('rejects a duplicate entrance name within the same block', async () => {
            const {service} = build({existingName: {id: 'entrance-existing'}});
            await expect(service.create(user, 'block-1', {name: '1'} as any)).rejects.toThrow(BadRequestException);
        });

        it('auto-increments order from the highest existing entrance order', async () => {
            const {service, prisma} = build({lastEntrance: {order: 2}});
            await service.create(user, 'block-1', {name: '2'} as any);

            expect(prisma.entrance.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 3})}),
            );
        });

        it('derives projectId from the block', async () => {
            const {service, prisma} = build({block: {id: 'block-1', projectId: 'project-9'}});
            await service.create(user, 'block-1', {name: '1'} as any);

            expect(prisma.entrance.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({projectId: 'project-9'})}),
            );
        });
    });

    describe('duplicate', () => {
        function sourceEntrance(overrides: Record<string, unknown> = {}) {
            return {
                id: 'entrance-1',
                name: '1',
                blockId: 'block-1',
                projectId: 'project-1',
                floors: [
                    {number: 1, order: 1, units: [{type: 'APARTMENT', rooms: 2, area: 50, price: 50000}]},
                ],
                ...overrides,
            };
        }

        it('404s for an entrance outside the caller company', async () => {
            const {service} = build({entrance: null});
            await expect(service.duplicate(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('probes "(copy)", "(copy 2)", ... for a free name within the block', async () => {
            const {service, prisma} = build({
                entrance: sourceEntrance(),
                existingNames: [{name: '1'}, {name: '1 (copy)'}],
            });
            await service.duplicate(user, 'entrance-1');

            expect(prisma.entrance.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({name: '1 (copy 2)'})}),
            );
        });

        it('continues unit numbering from the block-wide highest existing unit number, not from 1', async () => {
            const {service, prisma} = build({
                entrance: sourceEntrance(),
                allUnits: [{number: '10'}, {number: '15'}, {number: 'not-a-number'}],
            });

            await service.duplicate(user, 'entrance-1');

            const created = (prisma.unit.createMany as jest.Mock).mock.calls[0][0].data;
            expect(created.map((u: any) => u.number)).toEqual(['16']);
            expect(created[0].status).toBe(UnitStatus.AVAILABLE);
        });

        it('starts unit numbering at 1 when the block has no existing units', async () => {
            const {service, prisma} = build({entrance: sourceEntrance(), allUnits: []});
            await service.duplicate(user, 'entrance-1');

            const created = (prisma.unit.createMany as jest.Mock).mock.calls[0][0].data;
            expect(created.map((u: any) => u.number)).toEqual(['1']);
        });

        it('scopes the max-unit-number lookup to the entrance own block', async () => {
            const {service, prisma} = build({entrance: sourceEntrance({blockId: 'block-42'})});
            await service.duplicate(user, 'entrance-1');

            expect(prisma.unit.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {blockId: 'block-42'}}),
            );
        });
    });

    describe('remove', () => {
        it('404s for an entrance outside the caller company', async () => {
            const {service} = build({entrance: null});
            await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it.each([
            [{floors: 1, units: 0}],
            [{floors: 0, units: 1}],
        ])('rejects deleting an entrance with %o still attached', async (counts) => {
            const {service} = build({entrance: {id: 'entrance-1', _count: counts}});
            await expect(service.remove(user, 'entrance-1')).rejects.toThrow(BadRequestException);
        });

        it('deletes an entrance with nothing attached', async () => {
            const {service, prisma} = build({entrance: {id: 'entrance-1', _count: {floors: 0, units: 0}}});
            const result = await service.remove(user, 'entrance-1');

            expect(prisma.entrance.delete).toHaveBeenCalledWith({where: {id: 'entrance-1'}});
            expect(result).toEqual({success: true});
        });
    });
});
