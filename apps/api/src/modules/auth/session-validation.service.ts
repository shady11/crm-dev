import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';

export interface JwtPayload extends AuthUser {
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
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Session is no longer valid.');
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
        };
    }
}