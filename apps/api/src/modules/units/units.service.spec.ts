import {BadRequestException, ConflictException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {UnitStatus} from '@/generated/prisma/client';
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
        roleId: 'role-company-admin',
        roleName: 'Company Admin',
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
        holdingDeal?: unknown;
        updateManyCount?: number;
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
                updateMany: jest.fn().mockResolvedValue({count: opts.updateManyCount ?? 1}),
                findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(opts.unit)),
                delete: jest.fn().mockResolvedValue({id: 'unit-1'}),
            },
            floor: {
                findFirst: jest.fn().mockResolvedValue(opts.floor ?? null),
            },
            deal: {
                findFirst: jest.fn().mockResolvedValue(opts.holdingDeal ?? null),
            },
            activity: {
                create: jest.fn().mockResolvedValue({id: 'activity-1'}),
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

        it('accepts UNAVAILABLE as an initial status', async () => {
            const {service, prisma} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
            });

            await service.create(adminUser, 'floor-1', createDto({status: UnitStatus.UNAVAILABLE}));

            expect(prisma.unit.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({status: UnitStatus.UNAVAILABLE})}),
            );
        });

        it.each([UnitStatus.RESERVED, UnitStatus.SOLD])('rejects %s as an initial status — only deals set it', async (status) => {
            const {service, prisma} = build({
                floor: {id: 'floor-1', projectId: 'p1', blockId: 'block-1', entranceId: 'e1'},
            });

            await expect(service.create(adminUser, 'floor-1', createDto({status}))).rejects.toThrow(BadRequestException);
            expect(prisma.unit.create).not.toHaveBeenCalled();
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

        it('lets a price edit on a deal-held unit through when the status is resent unchanged', async () => {
            const unit = {id: 'unit-1', number: '101', blockId: 'block-1', status: UnitStatus.RESERVED};
            const {service, prisma} = build({unit, holdingDeal: {dealNumber: 'D-1', status: 'RESERVED'}});

            await service.update(adminUser, 'unit-1', {price: 999, status: UnitStatus.RESERVED} as any);

            expect(prisma.deal.findFirst).not.toHaveBeenCalled();
            expect(prisma.unit.update).toHaveBeenCalledWith({
                where: {id: 'unit-1'},
                data: expect.objectContaining({price: 999, status: undefined}),
            });
        });

        it('refuses a status change on a unit held by a deal', async () => {
            const unit = {id: 'unit-1', number: '101', blockId: 'block-1', status: UnitStatus.RESERVED};
            const {service, prisma} = build({unit, holdingDeal: {dealNumber: 'D-1', status: 'CONTRACT_SIGNED'}});

            await expect(
                service.update(adminUser, 'unit-1', {status: UnitStatus.AVAILABLE} as any),
            ).rejects.toThrow(ConflictException);
            expect(prisma.unit.update).not.toHaveBeenCalled();
            expect(prisma.unit.updateMany).not.toHaveBeenCalled();
        });

        it('writes a status change conditionally on the status it read', async () => {
            const unit = {id: 'unit-1', number: '101', blockId: 'block-1', status: UnitStatus.AVAILABLE};
            const {service, prisma} = build({unit});

            await service.update(adminUser, 'unit-1', {status: UnitStatus.UNAVAILABLE, price: 5} as any);

            expect(prisma.unit.updateMany).toHaveBeenCalledWith({
                where: {id: 'unit-1', status: UnitStatus.AVAILABLE},
                data: expect.objectContaining({status: UnitStatus.UNAVAILABLE, price: 5}),
            });
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
        const availableUnit = {id: 'unit-1', number: '101', status: UnitStatus.AVAILABLE};

        it('404s for a unit outside the company', async () => {
            const {service} = build({unit: null});
            await expect(service.updateStatus(adminUser, 'missing', UnitStatus.UNAVAILABLE)).rejects.toThrow(NotFoundException);
        });

        it.each([UnitStatus.RESERVED, UnitStatus.SOLD])('rejects %s as a manual target — only deals set it', async (status) => {
            const {service, prisma} = build({unit: availableUnit});

            await expect(service.updateStatus(adminUser, 'unit-1', status)).rejects.toThrow(BadRequestException);
            expect(prisma.unit.updateMany).not.toHaveBeenCalled();
        });

        it('refuses to release a unit held by an in-progress or completed deal', async () => {
            const {service, prisma} = build({
                unit: {id: 'unit-1', number: '101', status: UnitStatus.SOLD},
                holdingDeal: {dealNumber: 'D-1', status: 'COMPLETED'},
            });

            await expect(service.updateStatus(adminUser, 'unit-1', UnitStatus.AVAILABLE)).rejects.toThrow(ConflictException);
            expect(prisma.deal.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    unitId: 'unit-1',
                    deletedAt: null,
                    status: {in: ['RESERVED', 'CONTRACT_SIGNED', 'ACTIVE', 'COMPLETED']},
                }),
            }));
            expect(prisma.unit.updateMany).not.toHaveBeenCalled();
        });

        it('lets an orphaned RESERVED unit with no deal be corrected back to AVAILABLE', async () => {
            const {service, prisma} = build({unit: {id: 'unit-1', number: '101', status: UnitStatus.RESERVED}});

            await service.updateStatus(adminUser, 'unit-1', UnitStatus.AVAILABLE);

            expect(prisma.unit.updateMany).toHaveBeenCalledWith({
                where: {id: 'unit-1', status: UnitStatus.RESERVED},
                data: {status: UnitStatus.AVAILABLE},
            });
        });

        it('writes only the status, conditionally on the status it read', async () => {
            const {service, prisma} = build({unit: availableUnit});
            await service.updateStatus(adminUser, 'unit-1', UnitStatus.UNAVAILABLE);

            expect(prisma.unit.updateMany).toHaveBeenCalledWith({
                where: {id: 'unit-1', status: UnitStatus.AVAILABLE},
                data: {status: UnitStatus.UNAVAILABLE},
            });
        });

        it('409s when the unit changed status between the read and the write', async () => {
            const {service} = build({unit: availableUnit, updateManyCount: 0});

            await expect(service.updateStatus(adminUser, 'unit-1', UnitStatus.UNAVAILABLE)).rejects.toThrow(ConflictException);
        });

        it('is a no-op when the status is unchanged', async () => {
            const {service, prisma} = build({unit: availableUnit});
            await service.updateStatus(adminUser, 'unit-1', UnitStatus.AVAILABLE);

            expect(prisma.deal.findFirst).not.toHaveBeenCalled();
            expect(prisma.unit.updateMany).not.toHaveBeenCalled();
            expect(prisma.activity.create).not.toHaveBeenCalled();
        });
    });
});
