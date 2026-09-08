import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from "@nestjs/common";
import {Observable, tap} from "rxjs";
import {AuditAction} from "@/generated/prisma/client";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {AuthUser} from "@/common/types/auth-user.type";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Ending an impersonation session is itself logged explicitly by
// ImpersonationService.end() (as IMPERSONATION_ENDED) — excluded here so that
// one call doesn't produce two audit rows.
const EXCLUDED_PATHS = new Set(["/auth/end-impersonation"]);

/**
 * "Every action taken during impersonation is tagged in the audit log with
 * both the SUPER_ADMIN's id and the impersonated user's id" (US-A1).
 *
 * Registered globally rather than threading a second actor id through every
 * service in the app: a no-op for every ordinary request (no impersonation
 * claim on the token), and for an impersonated one it records one row per
 * mutating request at the HTTP layer, tagged with both ids.
 */
@Injectable()
export class ImpersonationAuditInterceptor implements NestInterceptor {
    constructor(private readonly auditLog: AuditLogService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user?.impersonation || !MUTATING_METHODS.has(request.method) || EXCLUDED_PATHS.has(request.path)) {
            return next.handle();
        }

        const impersonation = user.impersonation;

        return next.handle().pipe(
            tap(() => {
                void this.auditLog.record({
                    actorId: impersonation.superAdminId,
                    actorEmail: impersonation.superAdminEmail,
                    action: AuditAction.IMPERSONATED_ACTION,
                    targetType: "User",
                    targetId: user.id,
                    companyId: user.companyId ?? undefined,
                    metadata: {method: request.method, path: request.path},
                });
            }),
        );
    }
}
