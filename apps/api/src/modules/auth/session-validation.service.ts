import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';

// The JWT itself never carries company settings (currency/locale/timezone) -
// validate() below always re-queries them fresh, so a change to a company's
// settings takes effect on the very next request instead of waiting for
// every outstanding token to expire.
export interface JwtPayload extends Omit<AuthUser, 'company'> {
    iat: number;
    exp: number;
}

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
        };
    }
}