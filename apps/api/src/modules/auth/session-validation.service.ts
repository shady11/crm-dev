import {Injectable, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {UserRole} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';

const DEFAULT_SUPER_ADMIN_SESSION_MAX_AGE_MINUTES = 60;

// The JWT itself never carries company settings (currency/locale/timezone) -
// validate() below always re-queries them fresh, so a change to a company's
// settings takes effect on the very next request instead of waiting for
// every outstanding token to expire. Same reasoning for impersonation: the
// signed claim carries only the session id and the acting SUPER_ADMIN's id -
// their current email/name is always re-read from the database below, never
// trusted from an old token.
export interface JwtPayload extends Omit<AuthUser, 'company' | 'branch' | 'impersonation'> {
    impersonation?: {
        sessionId: string;
        superAdminId: string;
    };
    iat: number;
    exp: number;
}

@Injectable()
export class SessionValidationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async validate(payload: JwtPayload): Promise<AuthUser> {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                companyId: true,
                branchId: true,
                isActive: true,
                sessionsValidFrom: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        currency: true,
                        locale: true,
                        timezone: true,
                        suspendedAt: true,
                        deletedAt: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Session is no longer valid.');
        }

        // A suspended or deleted tenant must stop working immediately, for every
        // one of its users. Checking it here — rather than deactivating each
        // user account when a company is suspended — means suspension is one
        // reversible field, and resuming does not have to guess which accounts
        // were already inactive beforehand.
        //
        // SUPER_ADMIN has no company, so `company` is null and this never
        // applies to them.
        if (user.company && (user.company.suspendedAt || user.company.deletedAt)) {
            throw new UnauthorizedException('This company is not active. Contact your administrator.');
        }

        const CLOCK_SKEW_TOLERANCE_MS = 2000;
        const tokenIssuedAtMs = payload.iat * 1000;

        if (tokenIssuedAtMs < user.sessionsValidFrom.getTime() - CLOCK_SKEW_TOLERANCE_MS) {
            throw new UnauthorizedException('Session has been revoked. Please log in again.');
        }

        // SUPER_ADMIN accounts are held to a shorter effective session lifetime
        // than the standard 7-day JWT: compromise of one account compromises
        // every tenant. Enforced here, on top of sessionsValidFrom, rather than
        // by forking JwtModule's expiresIn — no schema change, and it composes
        // with the revocation check above instead of replacing it.
        if (user.role === UserRole.SUPER_ADMIN) {
            const maxAgeMinutes =
                Number(this.configService.get<string>('SUPER_ADMIN_SESSION_MAX_AGE_MINUTES')) ||
                DEFAULT_SUPER_ADMIN_SESSION_MAX_AGE_MINUTES;
            const maxAgeMs = maxAgeMinutes * 60 * 1000;

            if (Date.now() - tokenIssuedAtMs > maxAgeMs) {
                throw new UnauthorizedException('Session has expired. Please log in again.');
            }
        }

        // A token signed for an impersonation only remains valid while its
        // ImpersonationSession is neither ended nor expired - independent of
        // the JWT's own exp, which is set to the same window at signing time
        // but is not the source of truth (the session can be ended early via
        // /auth/end-impersonation).
        let impersonation: AuthUser['impersonation'] = null;

        if (payload.impersonation) {
            const session = await this.prisma.impersonationSession.findUnique({
                where: {id: payload.impersonation.sessionId},
                select: {
                    id: true,
                    superAdminId: true,
                    targetUserId: true,
                    expiresAt: true,
                    endedAt: true,
                    superAdmin: {select: {email: true, fullName: true}},
                },
            });

            if (
                !session ||
                session.targetUserId !== user.id ||
                session.endedAt ||
                session.expiresAt.getTime() < Date.now()
            ) {
                throw new UnauthorizedException('Impersonation session has ended. Please log in again.');
            }

            impersonation = {
                sessionId: session.id,
                superAdminId: session.superAdminId,
                superAdminEmail: session.superAdmin.email,
                superAdminName: session.superAdmin.fullName,
            };
        }

        return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            companyId: user.companyId,
            company: user.company
                ? {
                      id: user.company.id,
                      name: user.company.name,
                      currency: user.company.currency,
                      locale: user.company.locale,
                      timezone: user.company.timezone,
                  }
                : null,
            branchId: user.branchId,
            branch: user.branch
                ? {
                      id: user.branch.id,
                      name: user.branch.name,
                      city: user.branch.city,
                  }
                : null,
            impersonation,
        };
    }
}