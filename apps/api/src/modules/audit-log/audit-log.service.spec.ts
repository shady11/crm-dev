import {AuditLogService} from './audit-log.service';
import {AuditAction} from '@/generated/prisma/client';

/**
 * The audit trail's one hard requirement: a write failure here must never
 * propagate and roll back the SUPER_ADMIN action that triggered it — an
 * unlogged action is an acceptable degradation, a rolled-back one is not.
 * findAll()'s filters are the read side operators actually rely on to
 * investigate an incident, so each is checked independently.
 */
describe('AuditLogService', () => {
    function build() {
        const prisma = {
            auditLog: {
                create: jest.fn().mockResolvedValue({}),
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
            },
        };
        const service = new AuditLogService(prisma as any);
        return {service, prisma};
    }

    const input = (overrides: Record<string, unknown> = {}) => ({
        actorId: 'admin-1',
        actorEmail: 'admin@crm.dev',
        action: AuditAction.IMPERSONATION_STARTED,
        targetType: 'User',
        ...overrides,
    });

    describe('record', () => {
        it('writes every given field to the audit log', async () => {
            const {service, prisma} = build();
            await service.record(input({targetId: 'user-1', companyId: 'company-1', metadata: {x: 1}}));

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    actorId: 'admin-1',
                    actorEmail: 'admin@crm.dev',
                    action: AuditAction.IMPERSONATION_STARTED,
                    targetType: 'User',
                    targetId: 'user-1',
                    companyId: 'company-1',
                    metadata: {x: 1},
                }),
            });
        });

        it('never throws when the write fails, so the caller action it logs can never be rolled back by it', async () => {
            const {service, prisma} = build();
            prisma.auditLog.create.mockRejectedValue(new Error('DB unavailable'));

            await expect(service.record(input())).resolves.toBeUndefined();
        });
    });

    describe('findAll', () => {
        it('applies no filters when none are given', async () => {
            const {service, prisma} = build();
            await service.findAll({});

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({where: {}}),
            );
        });

        it('filters by companyId, actorId, and action independently', async () => {
            const {service, prisma} = build();
            await service.findAll({companyId: 'company-1', actorId: 'admin-1', action: AuditAction.IMPERSONATION_ENDED} as any);

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {companyId: 'company-1', actorId: 'admin-1', action: AuditAction.IMPERSONATION_ENDED},
                }),
            );
        });

        it('builds a createdAt range from dateFrom/dateTo', async () => {
            const {service, prisma} = build();
            await service.findAll({dateFrom: '2026-01-01', dateTo: '2026-01-31'} as any);

            const where = (prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.createdAt).toEqual({gte: new Date('2026-01-01'), lte: new Date('2026-01-31')});
        });

        it('leaves the open end of the range undefined when only one bound is given', async () => {
            const {service, prisma} = build();
            await service.findAll({dateFrom: '2026-01-01'} as any);

            const where = (prisma.auditLog.findMany as jest.Mock).mock.calls[0][0].where;
            expect(where.createdAt).toEqual({gte: new Date('2026-01-01'), lte: undefined});
        });

        it('computes pagination meta from total and limit', async () => {
            const {service, prisma} = build();
            prisma.auditLog.count.mockResolvedValue(101);

            const result = await service.findAll({page: 1, limit: 50} as any);

            expect(result.meta).toEqual({page: 1, limit: 50, total: 101, pages: 3});
        });
    });
});
