import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UnitStatus, UserRole} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {UnitsService} from './units.service';

/**
 * UnitsService scopes everything through the unit's project->company chain
 * (rather than a direct companyId column), enforces unit-number uniqueness
 * within a block, and refuses to delete a unit that already has deals
 * attached. duplicate() additionally has to compute the next free unit
 * number itself from the existing numeric numbers in the block.
 */
describe('UnitsService', () => {
    const adminUser: AuthUser = {
        id: 'admin-1',
        email: 'admin@crm.dev',
        name: 'Admin',
        role: UserRole.COMPANY_ADMIN,
        companyId: 'company-1',
        company: null,
        branchId: null,
        branch: null,
    };

    function build(opts: {
        unit?: unknown;
        floor?: unknown;
        existingUnit?: unknown;
        allUnits?: {number: string}[];
    } = {}) {
        const prisma = {
            unit: {
                findMany: jest.fn().mockResolvedValue(opts.allUnits ?? []),
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockImplementation(({where}: any) => {
                    // ensureUnitNumberIsUniqueInsideBlock filters by `number`;
                    // the id/findOne-style lookups don't.
                    if (where.number !== undefined) return Promise.resolve(opts.existingUnit ?? null);
                    return Promise.resolve(opts.unit ?? null);
                }),
                create: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'unit-new', ...data})),
                update: jest.fn().mockImplementation(({data}) => Promise.resolve({id: 'unit-1', ...data})),
                delete: jest.fn().mockResolvedValue({id: 'unit-1'}),
            },
            floor: {
                findFirst: jest.fn().mockResolvedValue(opts.floor ?? null),
            },
        };

        const service = new UnitsService(prisma as any);
        return {service, prisma};
    }

    const createDto = (overrides: Record<string, unknown> = {}) => ({
        number: '101',
        type: 'APARTMENT',
        rooms: 2,
        area: 60,
        price: 100000,
        ...overrides,
    }) as any;

    describe('findAll', () => {
        it('rejects when the user has no company', async () => {
            const {service} = build();
            await expect(service.findAll({...adminUser, companyId: null}, {})).rejects.toThrow(ForbiddenException);
        });

        it('scopes the query through project.companyId', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {});

            expect(prisma.unit.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({project: {companyId: 'company-1'}, deletedAt: null}),
                }),
            );
        });

        it('applies optional block/entrance/floor/type/status/rooms filters', async () => {
            const {service, prisma} = build();
            await service.findAll(adminUser, {
                blockId: 'block-1',
                entranceId: 'entrance-1',
                floorId: 'floor-1',
                type: 'APARTMENT',
                status: UnitStatus.AVAILABLE,
                rooms: 3,
            } as any);

            const where = (prisma.unit.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where).toMatchObject({
                blockId: 'block-1',
                entranceId: 'entrance-1',
                floorId: 'floor-1',
                type: 'APARTMENT',
                status: UnitStatus.AVAILABLE,
                rooms: 3,
            });
        });
    });

    describe('findByFloor', () => {
        it('rejects a floor that does not belong to the company', async () => {
            const {service} = build({floor: null});
            await expect(service.findByFloor(adminUser, 'floor-1', {})).rejects.toThrow(BadRequestException);
        });

        it('scopes units to the given floor once ownership is confirmed', async () => {
            const {service, prisma} = build({floor: {id: 'floor-1'}});
            await service.findByFloor(adminUser, 'floor-1', {});

            expect(prisma.unit.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({floorId: 'floor-1'})}),
            );
        });
    });

    describe('findOne', () => {
        it('throws NotFoundException for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.findOne(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('returns the unit with its deals when found', async () => {
            const {service} = build({unit: {id: 'unit-1'}});
            await expect(service.findOne(adminUser, 'unit-1')).resolves.toEqual({id: 'unit-1'});
        });
    });

    describe('create', () => {
        it('rejects a floor that does not belong to the company', async () => {
            const {service} = build({floor: null});
            await expect(service.create(adminUser, 'floor-1', createDto())).rejects.toThrow(BadRequestException);
        });

        it('rejects a unit number already used inside the same block', async () => {
            const {service} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
                existingUnit: {id: 'unit-existing'},
            });
            await expect(service.create(adminUser, 'floor-1', createDto())).rejects.toThrow(BadRequestException);
        });

        it('defaults status to AVAILABLE and derives project/block/entrance from the floor', async () => {
            const {service, prisma} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
            });

            await service.create(adminUser, 'floor-1', createDto());

            expect(prisma.unit.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: UnitStatus.AVAILABLE,
                        projectId: 'p1',
                        blockId: 'block-1',
                        entranceId: 'e1',
                        floorId: 'floor-1',
                    }),
                }),
            );
        });

        it('honors an explicit status when provided', async () => {
            const {service, prisma} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
            });

            await service.create(adminUser, 'floor-1', createDto({status: UnitStatus.RESERVED}));

            expect(prisma.unit.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({status: UnitStatus.RESERVED})}),
            );
        });
    });

    describe('createBulk', () => {
        it('rejects a floor that does not belong to the company', async () => {
            const {service} = build({floor: null});
            await expect(
                service.createBulk(adminUser, 'floor-1', {units: [createDto()]} as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('creates one unit per entry, all AVAILABLE and on the same floor', async () => {
            const {service, prisma} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
            });

            await service.createBulk(adminUser, 'floor-1', {
                units: [createDto({number: '101'}), createDto({number: '102'})],
            } as any);

            expect(prisma.unit.create).toHaveBeenCalledTimes(2);
            const calls = (prisma.unit.create as jest.Mock).mock.calls;
            expect(calls[0][0].data).toMatchObject({number: '101', status: UnitStatus.AVAILABLE, floorId: 'floor-1'});
            expect(calls[1][0].data).toMatchObject({number: '102', status: UnitStatus.AVAILABLE, floorId: 'floor-1'});
        });
    });

    describe('update', () => {
        it('404s for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.update(adminUser, 'missing', {} as any)).rejects.toThrow(NotFoundException);
        });

        it('rejects renumbering to a number already used in the block, excluding itself', async () => {
            const {service, prisma} = build({
                unit: {id: 'unit-1', blockId: 'block-1'},
                existingUnit: {id: 'unit-2'},
            });

            await expect(service.update(adminUser, 'unit-1', {number: '999'} as any)).rejects.toThrow(BadRequestException);
            expect(prisma.unit.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({where: expect.objectContaining({id: {not: 'unit-1'}})}),
            );
        });

        it('skips the uniqueness check when number is unchanged', async () => {
            const {service, prisma} = build({unit: {id: 'unit-1', blockId: 'block-1'}});
            await service.update(adminUser, 'unit-1', {price: 999} as any);

            expect(prisma.unit.findFirst).toHaveBeenCalledTimes(1); // the initial ownership lookup only
        });
    });

    describe('duplicate', () => {
        it('404s for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.duplicate(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('assigns the next number above the highest existing numeric unit number in the block', async () => {
            const {service, prisma} = build({
                unit: {id: 'unit-1', blockId: 'block-1', type: 'APARTMENT', rooms: 2, area: 60, price: 1, projectId: 'p1', entranceId: 'e1', floorId: 'f1'},
                allUnits: [{number: '101'}, {number: '105'}, {number: 'penthouse'}],
            });

            await service.duplicate(adminUser, 'unit-1');

            expect(prisma.unit.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: '106', status: UnitStatus.AVAILABLE})}),
            );
        });

        it('starts numbering at 1 when the block has no existing numeric unit numbers', async () => {
            const {service, prisma} = build({
                unit: {id: 'unit-1', blockId: 'block-1', type: 'APARTMENT', rooms: 2, area: 60, price: 1, projectId: 'p1', entranceId: 'e1', floorId: 'f1'},
                allUnits: [],
            });

            await service.duplicate(adminUser, 'unit-1');

            expect(prisma.unit.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({number: '1'})}),
            );
        });
    });

    describe('remove', () => {
        it('404s for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.remove(adminUser, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('rejects deleting a unit that already has deals', async () => {
            const {service} = build({unit: {id: 'unit-1', _count: {deals: 2}}});
            await expect(service.remove(adminUser, 'unit-1')).rejects.toThrow(BadRequestException);
        });

        it('hard-deletes a unit with no deals', async () => {
            const {service, prisma} = build({unit: {id: 'unit-1', _count: {deals: 0}}});
            const result = await service.remove(adminUser, 'unit-1');

            expect(prisma.unit.delete).toHaveBeenCalledWith({where: {id: 'unit-1'}});
            expect(result).toEqual({success: true});
        });
    });

    describe('updateStatus', () => {
        it('404s for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.updateStatus(adminUser, 'missing', UnitStatus.SOLD)).rejects.toThrow(NotFoundException);
        });

        it('updates only the status field', async () => {
            const {service, prisma} = build({unit: {id: 'unit-1'}});
            await service.updateStatus(adminUser, 'unit-1', UnitStatus.SOLD);

            expect(prisma.unit.update).toHaveBeenCalledWith({
                where: {id: 'unit-1'},
                data: {status: UnitStatus.SOLD},
            });
        });
    });
});
