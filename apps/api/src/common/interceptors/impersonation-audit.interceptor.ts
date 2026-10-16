import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from "@nestjs/common";
import {Observable, tap} from "rxjs";
import {AuditAction} from "@/generated/prisma/client";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {runAsImpersonator} from "@/common/context/impersonation-context";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Ending an impersonation session is itself logged explicitly by
// ImpersonationService.end() (as IMPERSONATION_ENDED) — excluded here so that
// one call doesn't produce two audit rows. Matched on the end of the path:
// request.path carries the global "/api" prefix.
const EXCLUDED_PATH_SUFFIXES = ["/auth/end-impersonation"];

/**
 * "Every action taken during impersonation is tagged in the audit log with
 * both the SUPER_ADMIN's id and the impersonated user's id" (US-A1).
 *
 * Registered globally rather than threading a second actor id through every
 * service in the app: a no-op for every ordinary request (no impersonation
 * claim on the token). For an impersonated one it:
 * - runs the handler with the platform admin in the request context, so
 *   every Activity written meanwhile names them too (SA-2, PrismaService);
 * - records one audit row per mutating request, tagged with both ids, with
 *   the route's ids and the id of the record the request returned.
 */
@Injectable()
export class ImpersonationAuditInterceptor implements NestInterceptor {
    constructor(private readonly auditLog: AuditLogService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user?.impersonation) {
            return next.handle();
        }

        const impersonation = user.impersonation;
        const path: string = request.path;
        const audited = MUTATING_METHODS.has(request.method) && !EXCLUDED_PATH_SUFFIXES.some((suffix) => path.endsWith(suffix));

        // The handler runs when the observable is subscribed to, so subscribing
        // inside the context makes everything it awaits see the context too.
        const handled = new Observable<unknown>((subscriber) =>
            runAsImpersonator(impersonation.superAdminId, () => next.handle().subscribe(subscriber)),
        );

        if (!audited) {
            return handled;
        }

        return handled.pipe(
            tap((result) => {
                void this.auditLog.record({
                    actorId: impersonation.superAdminId,
                    actorEmail: impersonation.superAdminEmail,
                    action: AuditAction.IMPERSONATED_ACTION,
                    targetType: "User",
                    targetId: user.id,
                    companyId: user.companyId ?? undefined,
                    metadata: {
                        method: request.method,
                        path,
                        // SA-2: which record it touched, not only the URL.
                        ...(request.params && Object.keys(request.params).length ? {params: request.params} : {}),
                        ...(resultId(result) ? {resultId: resultId(result)} : {}),
                    },
                });
            }),
        );
    }
}

function resultId(result: unknown): string | undefined {
    if (result && typeof result === "object" && "id" in result && typeof result.id === "string") {
        return result.id;
    }
    return undefined;
}
