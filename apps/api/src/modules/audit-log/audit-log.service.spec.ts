import {ForbiddenException} from '@nestjs/common';
import {AuditLogService} from './audit-log.service';
import {AuditAction} from '@/generated/prisma/client';
import {AuthUser} from '@/common/types/auth-user.type';

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
            user: {findMany: jest.fn().mockResolvedValue([])},
            company: {findMany: jest.fn().mockResolvedValue([])},
            role: {findMany: jest.fn().mockResolvedValue([])},
            settingOption: {findMany: jest.fn().mockResolvedValue([])},
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

        it('SA-11: hides sign-ins when asked, unless a specific action is picked', async () => {
            const {service, prisma} = build();

            await service.findAll({hideLogins: true} as any);
            await service.findAll({hideLogins: true, action: AuditAction.LOGIN_FAILED} as any);

            const calls = (prisma.auditLog.findMany as jest.Mock).mock.calls;
            expect(calls[0][0].where.action).toEqual({
                notIn: [AuditAction.LOGIN_SUCCEEDED, AuditAction.LOGIN_FAILED],
            });
            expect(calls[1][0].where.action).toBe(AuditAction.LOGIN_FAILED);
        });

        it('SA-11: names each row\'s target, one lookup per kind of target', async () => {
            const {service, prisma} = build();
            prisma.auditLog.findMany.mockResolvedValue([
                {id: 'a1', targetType: 'User', targetId: 'u1'},
                {id: 'a2', targetType: 'Company', targetId: 'c1'},
                {id: 'a3', targetType: 'Role', targetId: 'r1'},
                {id: 'a4', targetType: 'SettingOption', targetId: 'o1'},
                {id: 'a5', targetType: 'User', targetId: 'u1'},
                {id: 'a6', targetType: 'User', targetId: 'gone'},
                {id: 'a7', targetType: 'User', targetId: null},
            ]);
            prisma.user.findMany.mockResolvedValue([{id: 'u1', fullName: 'Aibek Manager'}]);
            prisma.company.findMany.mockResolvedValue([{id: 'c1', name: 'Bishkek Dev'}]);
            prisma.role.findMany.mockResolvedValue([{id: 'r1', name: 'Sales Head'}]);
            prisma.settingOption.findMany.mockResolvedValue([{id: 'o1', code: 'KGS'}]);

            const {items} = await service.findAll({} as any);

            expect(items.map((item) => item.targetName)).toEqual([
                'Aibek Manager',
                'Bishkek Dev',
                'Sales Head',
                'KGS',
                'Aibek Manager',
                null,
                null,
            ]);
            expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
            expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({id: {in: ['u1', 'gone']}});
        });

        it('SA-11: looks nothing up when the page has no targets', async () => {
            const {service, prisma} = build();

            await service.findAll({} as any);

            expect(prisma.user.findMany).not.toHaveBeenCalled();
            expect(prisma.company.findMany).not.toHaveBeenCalled();
        });
    });

    /**
     * findOwnLogins is the tenant-scoped counterpart to findAll: a
     * COMPANY_ADMIN can reach this (via audit_log.view_own) but never
     * findAll (audit_log.view, SUPER_ADMIN only) — so this must never let
     * the caller see another tenant's logins or any non-login action type,
     * regardless of what's asked for.
     */
    describe('findOwnLogins', () => {
        const companyAdmin: AuthUser = {
            id: 'admin-1',
            email: 'admin@bishkekdev.kg',
            name: 'Aibek',
            roleId: 'role-company-admin',
            roleName: 'Company Admin',
            companyId: 'company-1',
            company: null,
            branchId: null,
            branch: null,
        };

        it('scopes to the caller\'s own company and only login actions', async () => {
            const {service, prisma} = build();
            await service.findOwnLogins(companyAdmin, {});

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        companyId: 'company-1',
                        action: {in: [AuditAction.LOGIN_SUCCEEDED, AuditAction.LOGIN_FAILED]},
                    },
                }),
            );
        });

        it('refuses an actor with no company — nothing to scope to', async () => {
            const {service} = build();
            const noCompany: AuthUser = {...companyAdmin, companyId: null, company: null};

            await expect(service.findOwnLogins(noCompany, {})).rejects.toThrow(ForbiddenException);
        });
    });
});
