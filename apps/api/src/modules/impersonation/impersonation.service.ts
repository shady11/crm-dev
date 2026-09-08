import {BadRequestException, Injectable, UnauthorizedException} from "@nestjs/common";
import {JwtService} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";
import {AuditAction} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {AuthCompanySummary, AuthUser} from "@/common/types/auth-user.type";
import {JwtPayload} from "@/modules/auth/session-validation.service";

const DEFAULT_IMPERSONATION_SESSION_MINUTES = 30;

export type ImpersonationTarget = {
    id: string;
    email: string;
    fullName: string;
    role: AuthUser["role"];
    companyId: string;
    phone: string | null;
};

/**
 * Impersonation sessions get their own table rather than reusing the normal
 * JWT/sessionsValidFrom mechanism — this is the single largest new risk
 * surface a SUPER_ADMIN has, and needs to be independently revocable,
 * time-limited, and auditable regardless of what the issued token itself
 * says. SessionValidationService is the other half: every request re-checks
 * the session row, not just the JWT's own exp.
 */
@Injectable()
export class ImpersonationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly auditLog: AuditLogService,
    ) {}

    private sessionMinutes(): number {
        return (
            Number(this.configService.get<string>("IMPERSONATION_SESSION_MINUTES")) ||
            DEFAULT_IMPERSONATION_SESSION_MINUTES
        );
    }

    async start(actor: AuthUser, target: ImpersonationTarget, company: AuthCompanySummary) {
        const minutes = this.sessionMinutes();
        const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

        const session = await this.prisma.impersonationSession.create({
            data: {
                superAdminId: actor.id,
                targetUserId: target.id,
                companyId: target.companyId,
                expiresAt,
            },
        });

        const payload: Omit<JwtPayload, "iat" | "exp"> = {
            id: target.id,
            email: target.email,
            name: target.fullName,
            role: target.role,
            companyId: target.companyId,
            impersonation: {sessionId: session.id, superAdminId: actor.id},
        };

        const accessToken = await this.jwtService.signAsync(payload, {expiresIn: `${minutes}m`});

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.IMPERSONATION_STARTED,
            targetType: "User",
            targetId: target.id,
            companyId: target.companyId,
            metadata: {sessionId: session.id, targetEmail: target.email},
        });

        return {
            accessToken,
            expiresAt,
            user: {
                id: target.id,
                fullName: target.fullName,
                email: target.email,
                phone: target.phone,
                role: target.role,
                companyId: target.companyId,
                company,
            },
        };
    }

    /**
     * Ends the current request's impersonation session and hands back a fresh
     * token for the original SUPER_ADMIN, so the frontend can swap the active
     * session in one round trip instead of forcing a full re-login.
     */
    async end(current: AuthUser) {
        if (!current.impersonation) {
            throw new BadRequestException("This session is not impersonating anyone");
        }

        await this.prisma.impersonationSession.updateMany({
            where: {id: current.impersonation.sessionId, endedAt: null},
            data: {endedAt: new Date()},
        });

        await this.auditLog.record({
            actorId: current.impersonation.superAdminId,
            actorEmail: current.impersonation.superAdminEmail,
            action: AuditAction.IMPERSONATION_ENDED,
            targetType: "User",
            targetId: current.id,
            companyId: current.companyId ?? undefined,
            metadata: {sessionId: current.impersonation.sessionId},
        });

        const superAdmin = await this.prisma.user.findUnique({
            where: {id: current.impersonation.superAdminId},
        });

        if (!superAdmin || !superAdmin.isActive) {
            throw new UnauthorizedException("Session is no longer valid.");
        }

        const payload: Omit<JwtPayload, "iat" | "exp"> = {
            id: superAdmin.id,
            email: superAdmin.email,
            name: superAdmin.fullName,
            role: superAdmin.role,
            companyId: superAdmin.companyId,
        };

        return {accessToken: await this.jwtService.signAsync(payload)};
    }
}
