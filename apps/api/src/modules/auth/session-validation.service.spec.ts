import {UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {UserRole} from '@/generated/prisma/client';
import {SessionValidationService, type JwtPayload} from './session-validation.service';

/**
 * SessionValidationService is the single choke point every authenticated
 * request passes through: token revocation, tenant suspension, the shorter
 * SUPER_ADMIN session lifetime, and impersonation-session liveness are all
 * enforced here rather than baked into the JWT itself. A regression in any
 * one of these checks silently reopens access that was supposed to be shut.
 */
describe('SessionValidationService.validate', () => {
    const basePayload = (overrides: Partial<JwtPayload> = {}): JwtPayload =>
        ({
            id: 'u1',
            email: 'user@crm.dev',
            name: 'User',
            role: UserRole.SALES_MANAGER,
            companyId: 'company-1',
            branchId: 'branch-1',
            iat: Math.floor(Date.now() / 1000),
            exp: 0,
            ...overrides,
        }) as JwtPayload;

    const baseUser = (overrides: Record<string, unknown> = {}) => ({
        id: 'u1',
        email: 'user@crm.dev',
        fullName: 'User',
        phone: null,
        role: UserRole.SALES_MANAGER,
        companyId: 'company-1',
        branchId: 'branch-1',
        isActive: true,
        sessionsValidFrom: new Date(Date.now() - 60_000),
        company: {
            id: 'company-1',
            name: 'Acme',
            currency: 'USD',
            locale: 'en',
            timezone: 'UTC',
            suspendedAt: null,
            deletedAt: null,
        },
        branch: {id: 'branch-1', name: 'HQ', city: 'Bishkek'},
        ...overrides,
    });

    function build(user: unknown, impersonationSession: unknown = null, configValues: Record<string, string> = {}) {
        const prisma = {
            user: {findUnique: jest.fn().mockResolvedValue(user)},
            impersonationSession: {findUnique: jest.fn().mockResolvedValue(impersonationSession)},
        };
        const configService = {
            get: jest.fn((key: string) => configValues[key]),
        } as unknown as ConfigService;

        const service = new SessionValidationService(prisma as any, configService);
        return {service, prisma};
    }

    it('returns the authenticated user for a valid token', async () => {
        const {service} = build(baseUser());
        const result = await service.validate(basePayload());

        expect(result).toMatchObject({
            id: 'u1',
            email: 'user@crm.dev',
            companyId: 'company-1',
            impersonation: null,
        });
    });

    it('rejects when the user no longer exists', async () => {
        const {service} = build(null);
        await expect(service.validate(basePayload())).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated user', async () => {
        const {service} = build(baseUser({isActive: false}));
        await expect(service.validate(basePayload())).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the company has been suspended', async () => {
        const {service} = build(
            baseUser({company: {id: 'company-1', name: 'Acme', currency: 'USD', locale: 'en', timezone: 'UTC', suspendedAt: new Date(), deletedAt: null}}),
        );
        await expect(service.validate(basePayload())).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the company has been soft-deleted', async () => {
        const {service} = build(
            baseUser({company: {id: 'company-1', name: 'Acme', currency: 'USD', locale: 'en', timezone: 'UTC', suspendedAt: null, deletedAt: new Date()}}),
        );
        await expect(service.validate(basePayload())).rejects.toThrow(UnauthorizedException);
    });

    it('never applies the suspension check to a SUPER_ADMIN (no company)', async () => {
        const {service} = build(
            baseUser({role: UserRole.SUPER_ADMIN, companyId: null, company: null, branchId: null, branch: null}),
        );
        const result = await service.validate(
            basePayload({role: UserRole.SUPER_ADMIN, companyId: null, branchId: null}),
        );
        expect(result.company).toBeNull();
    });

    it('rejects a token issued before the recorded sessionsValidFrom (revocation)', async () => {
        const {service} = build(baseUser({sessionsValidFrom: new Date(Date.now() + 60_000)}));
        await expect(service.validate(basePayload())).rejects.toThrow(UnauthorizedException);
    });

    it('tolerates a small clock-skew gap around sessionsValidFrom', async () => {
        const sessionsValidFrom = new Date();
        const iat = Math.floor((sessionsValidFrom.getTime() - 1000) / 1000);
        const {service} = build(baseUser({sessionsValidFrom}));
        await expect(service.validate(basePayload({iat}))).resolves.toBeDefined();
    });

    it('rejects a token issued past the skew tolerance before sessionsValidFrom', async () => {
        const sessionsValidFrom = new Date();
        const iat = Math.floor((sessionsValidFrom.getTime() - 5000) / 1000);
        const {service} = build(baseUser({sessionsValidFrom}));
        await expect(service.validate(basePayload({iat}))).rejects.toThrow(UnauthorizedException);
    });

    it('enforces the shorter SUPER_ADMIN session lifetime even though the JWT itself has not expired', async () => {
        const staleIat = Math.floor((Date.now() - 61 * 60 * 1000) / 1000);
        const {service} = build(
            baseUser({role: UserRole.SUPER_ADMIN, companyId: null, company: null, branchId: null, branch: null}),
        );
        await expect(
            service.validate(basePayload({role: UserRole.SUPER_ADMIN, companyId: null, branchId: null, iat: staleIat})),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('accepts a SUPER_ADMIN session still within the configured max age', async () => {
        const iat = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
        const {service} = build(
            baseUser({
                role: UserRole.SUPER_ADMIN,
                companyId: null,
                company: null,
                branchId: null,
                branch: null,
                sessionsValidFrom: new Date(0),
            }),
            null,
            {SUPER_ADMIN_SESSION_MAX_AGE_MINUTES: '10'},
        );
        await expect(
            service.validate(basePayload({role: UserRole.SUPER_ADMIN, companyId: null, branchId: null, iat})),
        ).resolves.toBeDefined();
    });

    it('rejects a SUPER_ADMIN session past a configured max age', async () => {
        const iat = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);
        const {service} = build(
            baseUser({role: UserRole.SUPER_ADMIN, companyId: null, company: null, branchId: null, branch: null}),
            null,
            {SUPER_ADMIN_SESSION_MAX_AGE_MINUTES: '10'},
        );
        await expect(
            service.validate(basePayload({role: UserRole.SUPER_ADMIN, companyId: null, branchId: null, iat})),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('never enforces the SUPER_ADMIN max-age check against a regular user', async () => {
        const staleIat = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);
        const {service} = build(baseUser({sessionsValidFrom: new Date(0)}));
        await expect(service.validate(basePayload({iat: staleIat}))).resolves.toBeDefined();
    });

    describe('impersonation liveness', () => {
        const impersonationPayload = basePayload({
            impersonation: {sessionId: 'session-1', superAdminId: 'admin-1'},
        });

        const liveSession = (overrides: Record<string, unknown> = {}) => ({
            id: 'session-1',
            superAdminId: 'admin-1',
            targetUserId: 'u1',
            expiresAt: new Date(Date.now() + 60_000),
            endedAt: null,
            superAdmin: {email: 'admin@crm.dev', fullName: 'Admin'},
            ...overrides,
        });

        it('accepts a live impersonation session and attaches the impersonation summary', async () => {
            const {service} = build(baseUser(), liveSession());
            const result = await service.validate(impersonationPayload);

            expect(result.impersonation).toEqual({
                sessionId: 'session-1',
                superAdminId: 'admin-1',
                superAdminEmail: 'admin@crm.dev',
                superAdminName: 'Admin',
            });
        });

        it('rejects when the impersonation session row no longer exists', async () => {
            const {service} = build(baseUser(), null);
            await expect(service.validate(impersonationPayload)).rejects.toThrow(UnauthorizedException);
        });

        it('rejects an impersonation session that was ended early', async () => {
            const {service} = build(baseUser(), liveSession({endedAt: new Date()}));
            await expect(service.validate(impersonationPayload)).rejects.toThrow(UnauthorizedException);
        });

        it('rejects an impersonation session past its own expiresAt', async () => {
            const {service} = build(baseUser(), liveSession({expiresAt: new Date(Date.now() - 1000)}));
            await expect(service.validate(impersonationPayload)).rejects.toThrow(UnauthorizedException);
        });

        it('rejects when the session row targets a different user than the token subject', async () => {
            const {service} = build(baseUser(), liveSession({targetUserId: 'someone-else'}));
            await expect(service.validate(impersonationPayload)).rejects.toThrow(UnauthorizedException);
        });

        it('never looks up an impersonation session for a normal (non-impersonated) token', async () => {
            const {service, prisma} = build(baseUser());
            await service.validate(basePayload());
            expect(prisma.impersonationSession.findUnique).not.toHaveBeenCalled();
        });
    });
});
