import {BadRequestException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {Prisma, UnitStatus, UnitType} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';
import {ChessboardService} from './chessboard.service';

/**
 * ChessboardService's real logic is entirely in-memory: a flat list of units
 * (each carrying its own block/entrance/floor) gets folded into a nested
 * block->entrance->floor tree, sorted at every level, plus a summary of
 * counts by status/type and total price. That folding — not the Prisma
 * query itself — is what these tests exercise.
 */
describe('ChessboardService.getProjectChessboard', () => {
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

    function unitRow(overrides: Record<string, unknown> = {}) {
        return {
            id: 'unit-1',
            number: '101',
            type: UnitType.APARTMENT,
            status: UnitStatus.AVAILABLE,
            rooms: 2,
            area: new Prisma.Decimal(50),
            price: new Prisma.Decimal(50000),
            block: {id: 'block-1', name: 'A', order: 1},
            entrance: {id: 'entrance-1', name: '1', order: 1},
            floor: {id: 'floor-1', number: 1, order: 1},
            ...overrides,
        };
    }

    function build(opts: {project?: unknown; units?: unknown[]; block?: unknown; entrance?: unknown} = {}) {
        const prisma = {
            project: {findFirst: jest.fn().mockResolvedValue(opts.project === undefined ? {id: 'project-1', name: 'Skyline'} : opts.project)},
            unit: {findMany: jest.fn().mockResolvedValue(opts.units ?? [])},
            block: {findFirst: jest.fn().mockResolvedValue(opts.block ?? null)},
            entrance: {findFirst: jest.fn().mockResolvedValue(opts.entrance ?? null)},
        };

        const service = new ChessboardService(prisma as any);
        return {service, prisma};
    }

    it('rejects when the user has no company', async () => {
        const {service} = build();
        await expect(service.getProjectChessboard({...user, companyId: null}, 'project-1', {})).rejects.toThrow(
            ForbiddenException,
        );
    });

    it('404s when the project is outside the caller company', async () => {
        const {service} = build({project: null});
        await expect(service.getProjectChessboard(user, 'missing', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects a blockId filter that does not belong to the project', async () => {
        const {service} = build({block: null});
        await expect(service.getProjectChessboard(user, 'project-1', {blockId: 'other-block'} as any)).rejects.toThrow(
            BadRequestException,
        );
    });

    it('rejects an entranceId filter that does not belong to the project', async () => {
        const {service} = build({entrance: null});
        await expect(
            service.getProjectChessboard(user, 'project-1', {entranceId: 'other-entrance'} as any),
        ).rejects.toThrow(BadRequestException);
    });

    it('groups units into a nested block -> entrance -> floor tree', async () => {
        const {service} = build({
            units: [
                unitRow({id: 'u1', number: '101'}),
                unitRow({id: 'u2', number: '102'}),
                unitRow({id: 'u3', number: '201', floor: {id: 'floor-2', number: 2, order: 2}}),
            ],
        });

        const result = await service.getProjectChessboard(user, 'project-1', {});

        expect(result.blocks).toHaveLength(1);
        expect(result.blocks[0].entrances).toHaveLength(1);
        expect(result.blocks[0].entrances[0].floors).toHaveLength(2);
        expect(result.blocks[0].entrances[0].floors.find((f: any) => f.id === 'floor-1').units).toHaveLength(2);
    });

    it('sorts blocks and entrances ascending by order, but floors within an entrance descending', async () => {
        const {service} = build({
            units: [
                unitRow({id: 'u1', block: {id: 'block-2', name: 'B', order: 2}, entrance: {id: 'e2', name: '1', order: 1}, floor: {id: 'f1', number: 1, order: 1}}),
                unitRow({id: 'u2', block: {id: 'block-1', name: 'A', order: 1}, entrance: {id: 'e1', name: '1', order: 1}, floor: {id: 'f2', number: 2, order: 2}}),
                unitRow({id: 'u3', block: {id: 'block-1', name: 'A', order: 1}, entrance: {id: 'e1', name: '1', order: 1}, floor: {id: 'f1', number: 1, order: 1}}),
            ],
        });

        const result = await service.getProjectChessboard(user, 'project-1', {});

        expect(result.blocks.map((b: any) => b.id)).toEqual(['block-1', 'block-2']);
        const floorsOfBlock1 = result.blocks[0].entrances[0].floors;
        expect(floorsOfBlock1.map((f: any) => f.order)).toEqual([2, 1]);
    });

    it('builds a summary with counts by status/type and total price', async () => {
        const {service} = build({
            units: [
                unitRow({id: 'u1', status: UnitStatus.AVAILABLE, type: UnitType.APARTMENT, price: new Prisma.Decimal(50000)}),
                unitRow({id: 'u2', status: UnitStatus.SOLD, type: UnitType.APARTMENT, price: new Prisma.Decimal(70000)}),
                unitRow({id: 'u3', status: UnitStatus.RESERVED, type: UnitType.COMMERCIAL, price: new Prisma.Decimal(30000)}),
            ],
        });

        const result = await service.getProjectChessboard(user, 'project-1', {});

        expect(result.summary).toEqual({
            totalUnits: 3,
            totalPrice: 150000,
            byStatus: {AVAILABLE: 1, RESERVED: 1, SOLD: 1, UNAVAILABLE: 0},
            byType: {APARTMENT: 2, COMMERCIAL: 1, PARKING: 0, STORAGE: 0},
        });
    });

    it('returns an empty summary and no blocks when there are no matching units', async () => {
        const {service} = build({units: []});
        const result = await service.getProjectChessboard(user, 'project-1', {});

        expect(result.blocks).toEqual([]);
        expect(result.summary.totalUnits).toBe(0);
        expect(result.summary.totalPrice).toBe(0);
    });

    it('echoes the applied filters back in the result', async () => {
        const {service} = build({block: {id: 'block-1'}, units: []});
        const result = await service.getProjectChessboard(user, 'project-1', {
            blockId: 'block-1', type: UnitType.APARTMENT, status: UnitStatus.AVAILABLE,
        } as any);

        expect(result.filters).toEqual({
            blockId: 'block-1',
            entranceId: null,
            type: UnitType.APARTMENT,
            status: UnitStatus.AVAILABLE,
        });
    });

    it('scopes the units query to the project and excludes soft-deleted units', async () => {
        const {service, prisma} = build();
        await service.getProjectChessboard(user, 'project-1', {});

        expect(prisma.unit.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({projectId: 'project-1', project: {companyId: 'company-1'}, deletedAt: null}),
            }),
        );
    });
});
