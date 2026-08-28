import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';

export interface JwtPayload extends AuthUser {
    iat: number;
    exp: number;
}

/**
 * Re-validates a decoded JWT against the current DB state of the user,
 * instead of trusting the token payload verbatim. Used by both the HTTP
 * JwtStrategy and the WebSocket NotificationsGateway — those are two
 * independent token-verification paths (the gateway calls jwtService.verify()
 * directly and never goes through JwtStrategy), so this needs to be shared
 * rather than duplicated, or they will drift.
 */
@Injectable()
export class SessionValidationService {
    constructor(private readonly prisma: PrismaService) {}

    async validate(payload: JwtPayload): Promise<AuthUser> {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                companyId: true,
                isActive: true,
                sessionsValidFrom: true,
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Session is no longer valid.');
        }

        // JWT `iat` is whole seconds since epoch (truncated down, per spec);
        // sessionsValidFrom is millisecond-precision. Comparing them directly
        // means a token issued in the same second sessionsValidFrom was bumped
        // to "now" can spuriously look "older" than it, since iat loses the
        // sub-second remainder. A small tolerance absorbs that truncation (and
        // any incidental clock skew between processes) without meaningfully
        // weakening the check — this only matters in a ~2s window right at the
        // moment of revocation, not for the "was this token issued long before
        // a revocation event" comparisons this guard actually exists for.
        const CLOCK_SKEW_TOLERANCE_MS = 2000;
        const tokenIssuedAtMs = payload.iat * 1000;

        // TEMPORARY — remove once this is resolved. Prints the actual gap so we
        // can see the real numbers instead of guessing at them.
        console.log('[SessionValidation]', {
            userId: user.id,
            tokenIssuedAt: new Date(tokenIssuedAtMs).toISOString(),
            sessionsValidFrom: user.sessionsValidFrom.toISOString(),
            gapMs: tokenIssuedAtMs - user.sessionsValidFrom.getTime(),
        });

        if (tokenIssuedAtMs < user.sessionsValidFrom.getTime() - CLOCK_SKEW_TOLERANCE_MS) {
            throw new UnauthorizedException('Session has been revoked. Please log in again.');
        }

        // Return fresh values, not the (possibly stale) JWT payload — this is
        // also what makes a role change take effect immediately instead of only
        // on next login, without that having to be a separate feature.
        return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            companyId: user.companyId,
        };
    }
}