import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UnitStatus} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {BlocksService} from './blocks.service';

/**
 * BlocksService's riskiest logic is duplicate(): it deep-clones a block's
 * entire entrance/floor/unit tree, has to avoid colliding with an existing
 * block name (via a "(copy)", "(copy 2)", ... probe), and renumbers every
 * cloned unit sequentially across the whole new block rather than reusing
 * the source numbers (which would immediately collide within the block).
 * remove()'s three-way occupancy guard is the other thing worth pinning
 * down — a block can never be deleted while anything still references it.
 */
describe('BlocksService', () => {
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
        project?: unknown;
        block?: unknown;
        existingName?: unknown;
        lastBlock?: unknown;
        existingNames?: {name: string}[];
        duplicatedResult?: unknown;
    } = {}) {
        const prisma = {
            project: {findFirst: jest.fn().mockResolvedValue(opts.project === undefined ? {id: 'project-1'} : opts.project)},
            block: {
                findMany: jest.fn().mockResolvedValue(opts.existingNames ?? []),
                findFirst: jest.fn().mockImplementation((args: any) => {
                    if (args.orderBy) return Promise.resolve(opts.lastBlock ?? null);
                    if (args.where.name !== undefined) return Promise.resolve(opts.existingName ?? null);
                    return Promise.resolve(opts.block ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'block-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'block-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'block-1'}),
                findUnique: jest.fn().mockResolvedValue(opts.duplicatedResult ?? {id: 'block-new'}),
            },
            entrance: {create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'entrance-new', ...data}))},
            floor: {create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'floor-new', ...data}))},
            unit: {createMany: jest.fn().mockResolvedValue({count: 0})},
        };

        const service = new BlocksService(prisma as any);
        return {service, prisma};
    }

    describe('create', () => {
        it('rejects a project outside the caller company', async () => {
            const {service} = build({project: null});
            await expect(service.create(user, 'project-1', {name: 'A'} as any)).rejects.toThrow(BadRequestException);
        });

        it('rejects a duplicate block name within the same project', async () => {
            const {service} = build({existingName: {id: 'block-existing'}});
            await expect(service.create(user, 'project-1', {name: 'A'} as any)).rejects.toThrow(BadRequestException);
        });

        it('auto-increments order from the highest existing block order', async () => {
            const {service, prisma} = build({lastBlock: {order: 3}});
            await service.create(user, 'project-1', {name: 'B'} as any);

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 4})}),
            );
        });

        it('starts at order 1 for the first block in a project', async () => {
            const {service, prisma} = build({lastBlock: null});
            await service.create(user, 'project-1', {name: 'A'} as any);

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 1})}),
            );
        });

        it('honors an explicit order override', async () => {
            const {service, prisma} = build({lastBlock: {order: 3}});
            await service.create(user, 'project-1', {name: 'A', order: 99} as any);

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 99})}),
            );
        });
    });

    describe('update', () => {
        it('404s for a block outside the caller company', async () => {
            const {service} = build({block: null});
            await expect(service.update(user, 'missing', {name: 'X'} as any)).rejects.toThrow(NotFoundException);
        });

        it('rejects renaming to a name already used in the same project, excluding itself', async () => {
            const {service, prisma} = build({block: {id: 'block-1', projectId: 'project-1'}, existingName: {id: 'block-2'}});
            await expect(service.update(user, 'block-1', {name: 'Taken'} as any)).rejects.toThrow(BadRequestException);

            expect(prisma.block.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'block-1'}})}),
            );
        });
    });

    describe('duplicate', () => {
        function sourceBlock(overrides: Record<string, unknown> = {}) {
            return {
                id: 'block-1',
                name: 'A',
                projectId: 'project-1',
                entrances: [
                    {
                        id: 'entrance-1', name: '1', order: 1,
                        floors: [
                            {
                                id: 'floor-1', number: 1, order: 1,
                                units: [
                                    {type: 'APARTMENT', rooms: 2, area: 50, price: 50000},
                                    {type: 'APARTMENT', rooms: 3, area: 70, price: 70000},
                                ],
                            },
                        ],
                    },
                ],
                ...overrides,
            };
        }

        it('404s for a block outside the caller company', async () => {
            const {service} = build({block: null});
            await expect(service.duplicate(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('names the copy "<name> (copy)" when that name is free', async () => {
            const {service, prisma} = build({block: sourceBlock(), existingNames: [{name: 'A'}]});
            await service.duplicate(user, 'block-1');

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({name: 'A (copy)'})}),
            );
        });

        it('probes "(copy 2)", "(copy 3)", ... until a free name is found', async () => {
            const {service, prisma} = build({
                block: sourceBlock(),
                existingNames: [{name: 'A'}, {name: 'A (copy)'}, {name: 'A (copy 2)'}],
            });
            await service.duplicate(user, 'block-1');

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({name: 'A (copy 3)'})}),
            );
        });

        it('places the new block after the highest existing order', async () => {
            const {service, prisma} = build({block: sourceBlock(), lastBlock: {order: 5}});
            await service.duplicate(user, 'block-1');

            expect(prisma.block.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({order: 6})}),
            );
        });

        it('clones every entrance and floor under the new block', async () => {
            const {service, prisma} = build({block: sourceBlock()});
            await service.duplicate(user, 'block-1');

            expect(prisma.entrance.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({name: '1', block: {connect: {id: 'block-new'}}})}),
            );
            expect(prisma.floor.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: 1, block: {connect: {id: 'block-new'}}})}),
            );
        });

        it('renumbers cloned units sequentially starting at 1, ignoring the source numbers', async () => {
            const {service, prisma} = build({block: sourceBlock()});
            await service.duplicate(user, 'block-1');

            const created = (prisma.unit.createMany as jest.Mock).mock.calls[0][0].data;
            expect(created.map((u: any) => u.number)).toEqual(['1', '2']);
            expect(created.every((u: any) => u.status === UnitStatus.AVAILABLE)).toBe(true);
        });

        it('continues unit numbering across multiple floors rather than restarting per floor', async () => {
            const {service, prisma} = build({
                block: sourceBlock({
                    entrances: [{
                        id: 'entrance-1', name: '1', order: 1,
                        floors: [
                            {id: 'floor-1', number: 1, order: 1, units: [{type: 'APARTMENT', rooms: 2, area: 50, price: 50000}]},
                            {id: 'floor-2', number: 2, order: 2, units: [{type: 'APARTMENT', rooms: 2, area: 50, price: 50000}]},
                        ],
                    }],
                }),
            });

            await service.duplicate(user, 'block-1');

            const allNumbers = (prisma.unit.createMany as jest.Mock).mock.calls.map((call) => call[0].data.map((u: any) => u.number));
            expect(allNumbers).toEqual([['1'], ['2']]);
        });

        it('skips unit creation for a floor with no units', async () => {
            const {service, prisma} = build({
                block: sourceBlock({
                    entrances: [{id: 'entrance-1', name: '1', order: 1, floors: [{id: 'floor-1', number: 1, order: 1, units: []}]}],
                }),
            });

            await service.duplicate(user, 'block-1');
            expect(prisma.unit.createMany).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('404s for a block outside the caller company', async () => {
            const {service} = build({block: null});
            await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
        });

        it.each([
            [{entrances: 1, floors: 0, units: 0}],
            [{entrances: 0, floors: 1, units: 0}],
            [{entrances: 0, floors: 0, units: 1}],
        ])('rejects deleting a block with %o still attached', async (counts) => {
            const {service} = build({block: {id: 'block-1', _count: counts}});
            await expect(service.remove(user, 'block-1')).rejects.toThrow(BadRequestException);
        });

        it('deletes a block with nothing attached', async () => {
            const {service, prisma} = build({block: {id: 'block-1', _count: {entrances: 0, floors: 0, units: 0}}});
            const result = await service.remove(user, 'block-1');

            expect(prisma.block.delete).toHaveBeenCalledWith({where: {id: 'block-1'}});
            expect(result).toEqual({success: true});
        });
    });
});
