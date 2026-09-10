import {BadRequestException, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import {AuditAction, UserRole} from '@/generated/prisma/client';
import {ImpersonationService, type ImpersonationTarget} from './impersonation.service';

/**
 * Impersonation is the highest-privilege action a SUPER_ADMIN can take. These
 * tests pin down: the session row is created and time-boxed before any token
 * is signed, every start/end is audited with the real actor (not the
 * impersonated identity), and ending restores the SUPER_ADMIN's own token
 * rather than silently keeping the target's session alive.
 */
describe('ImpersonationService', () => {
    const actor = {
        id: 'admin-1',
        email: 'admin@crm.dev',
        name: 'Admin',
        role: UserRole.SUPER_ADMIN,
        companyId: null,
        company: null,
        branchId: null,
        branch: null,
    } as any;

    const target: ImpersonationTarget = {
        id: 'target-1',
        email: 'manager@crm.dev',
        fullName: 'Manager',
        role: UserRole.SALES_MANAGER,
        companyId: 'company-1',
        branchId: 'branch-1',
        phone: '+996700000000',
    };

    const companySummary = {id: 'company-1', name: 'Acme', currency: 'USD', locale: 'en', timezone: 'UTC'};

    function build(configValues: Record<string, string> = {}) {
        const prisma = {
            impersonationSession: {
                create: jest.fn().mockResolvedValue({id: 'session-1', expiresAt: new Date(Date.now() + 30 * 60 * 1000)}),
                updateMany: jest.fn().mockResolvedValue({count: 1}),
            },
            user: {
                findUnique: jest.fn(),
            },
        };
        const jwtService = {signAsync: jest.fn().mockResolvedValue('signed-token')} as unknown as JwtService;
        const configService = {get: jest.fn((key: string) => configValues[key])} as unknown as ConfigService;
        const auditLog = {record: jest.fn().mockResolvedValue(undefined)};

        const service = new ImpersonationService(prisma as any, jwtService, configService, auditLog as any);
        return {service, prisma, jwtService, auditLog};
    }

    describe('start', () => {
        it('creates a time-boxed session row before signing the token', async () => {
            const {service, prisma} = build();
            await service.start(actor, target, companySummary);

            expect(prisma.impersonationSession.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    superAdminId: 'admin-1',
                    targetUserId: 'target-1',
                    companyId: 'company-1',
                }),
            });
        });

        it('uses the configured session length for both the DB expiry and the JWT ttl', async () => {
            const {service, prisma, jwtService} = build({IMPERSONATION_SESSION_MINUTES: '15'});
            const before = Date.now();
            await service.start(actor, target, companySummary);
            const after = Date.now();

            const createArgs = (prisma.impersonationSession.create as jest.Mock).mock.calls[0][0];
            const expiresAt = createArgs.data.expiresAt.getTime();
            expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
            expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60 * 1000);

            expect(jwtService.signAsync).toHaveBeenCalledWith(expect.anything(), {expiresIn: '15m'});
        });

        it('falls back to the default session length when unconfigured', async () => {
            const {service, jwtService} = build();
            await service.start(actor, target, companySummary);
            expect(jwtService.signAsync).toHaveBeenCalledWith(expect.anything(), {expiresIn: '30m'});
        });

        it('signs the token with the target identity, carrying the acting admin only inside the impersonation claim', async () => {
            const {service, jwtService} = build();
            await service.start(actor, target, companySummary);

            const payload = (jwtService.signAsync as jest.Mock).mock.calls[0][0];
            expect(payload.id).toBe('target-1');
            expect(payload.role).toBe(UserRole.SALES_MANAGER);
            expect(payload.impersonation).toEqual({sessionId: 'session-1', superAdminId: 'admin-1'});
        });

        it('audits the start under the real actor, not the impersonated target', async () => {
            const {service, auditLog} = build();
            await service.start(actor, target, companySummary);

            expect(auditLog.record).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorId: 'admin-1',
                    actorEmail: 'admin@crm.dev',
                    action: AuditAction.IMPERSONATION_STARTED,
                    targetId: 'target-1',
                }),
            );
        });

        it('returns the target user profile alongside the token', async () => {
            const {service} = build();
            const result = await service.start(actor, target, companySummary);

            expect(result.accessToken).toBe('signed-token');
            expect(result.user).toMatchObject({id: 'target-1', email: 'manager@crm.dev', company: companySummary});
        });
    });

    describe('end', () => {
        const impersonatedUser = {
            id: 'target-1',
            email: 'manager@crm.dev',
            name: 'Manager',
            role: UserRole.SALES_MANAGER,
            companyId: 'company-1',
            company: companySummary,
            branchId: 'branch-1',
            branch: null,
            impersonation: {
                sessionId: 'session-1',
                superAdminId: 'admin-1',
                superAdminEmail: 'admin@crm.dev',
                superAdminName: 'Admin',
            },
        } as any;

        it('rejects ending when the current session is not impersonating anyone', async () => {
            const {service} = build();
            await expect(service.end({...impersonatedUser, impersonation: undefined})).rejects.toThrow(
                BadRequestException,
            );
        });

        it('marks only the live session as ended (guarded by endedAt: null)', async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue({
                id: 'admin-1',
                email: 'admin@crm.dev',
                fullName: 'Admin',
                role: UserRole.SUPER_ADMIN,
                companyId: null,
                branchId: null,
                isActive: true,
            });

            await service.end(impersonatedUser);

            expect(prisma.impersonationSession.updateMany).toHaveBeenCalledWith({
                where: {id: 'session-1', endedAt: null},
                data: {endedAt: expect.any(Date)},
            });
        });

        it('audits the end under the original super admin identity', async () => {
            const {service, prisma, auditLog} = build();
            prisma.user.findUnique.mockResolvedValue({
                id: 'admin-1', email: 'admin@crm.dev', fullName: 'Admin', role: UserRole.SUPER_ADMIN,
                companyId: null, branchId: null, isActive: true,
            });

            await service.end(impersonatedUser);

            expect(auditLog.record).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorId: 'admin-1',
                    action: AuditAction.IMPERSONATION_ENDED,
                    targetId: 'target-1',
                }),
            );
        });

        it('rejects if the original super admin account has since been deactivated', async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue({
                id: 'admin-1', email: 'admin@crm.dev', fullName: 'Admin', role: UserRole.SUPER_ADMIN,
                companyId: null, branchId: null, isActive: false,
            });

            await expect(service.end(impersonatedUser)).rejects.toThrow(UnauthorizedException);
        });

        it('rejects if the original super admin account no longer exists', async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.end(impersonatedUser)).rejects.toThrow(UnauthorizedException);
        });

        it('signs a fresh token for the super admin, without an impersonation claim', async () => {
            const {service, prisma, jwtService} = build();
            prisma.user.findUnique.mockResolvedValue({
                id: 'admin-1', email: 'admin@crm.dev', fullName: 'Admin', role: UserRole.SUPER_ADMIN,
                companyId: null, branchId: null, isActive: true,
            });

            const result = await service.end(impersonatedUser);

            const payload = (jwtService.signAsync as jest.Mock).mock.calls[0][0];
            expect(payload.id).toBe('admin-1');
            expect(payload.impersonation).toBeUndefined();
            expect(result.accessToken).toBe('signed-token');
        });
    });
});
