import {of} from "rxjs";
import {AuditAction} from "@/generated/prisma/client";
import {ImpersonationAuditInterceptor} from "./impersonation-audit.interceptor";

/**
 * US-A1: every mutating request made during an impersonated session must be
 * logged under both the acting SUPER_ADMIN's id and the impersonated user's
 * id. The interceptor is a no-op for an ordinary (non-impersonated) request,
 * for a read-only method, and for the one path (/auth/end-impersonation)
 * that already logs itself explicitly — double-logging that path would
 * produce two audit rows for one action.
 */
describe("ImpersonationAuditInterceptor", () => {
    function build() {
        const auditLog = {record: jest.fn().mockResolvedValue(undefined)};
        const interceptor = new ImpersonationAuditInterceptor(auditLog as any);
        return {interceptor, auditLog};
    }

    function contextWith(request: Record<string, unknown>) {
        return {
            switchToHttp: () => ({getRequest: () => request}),
        } as any;
    }

    const handler = (result: unknown = {}) => ({handle: () => of(result)});

    const impersonatedUser = {
        id: "target-1",
        companyId: "company-1",
        impersonation: {
            sessionId: "session-1",
            superAdminId: "admin-1",
            superAdminEmail: "admin@crm.dev",
            superAdminName: "Admin",
        },
    };

    it("is a no-op for a non-impersonated request", (done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: {id: "user-1", companyId: "company-1"}, method: "POST", path: "/deals"});

        interceptor.intercept(context, handler()).subscribe(() => {
            expect(auditLog.record).not.toHaveBeenCalled();
            done();
        });
    });

    it("is a no-op for a read-only (GET) request, even while impersonating", (done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: impersonatedUser, method: "GET", path: "/deals"});

        interceptor.intercept(context, handler()).subscribe(() => {
            expect(auditLog.record).not.toHaveBeenCalled();
            done();
        });
    });

    it("skips /auth/end-impersonation, which already logs itself explicitly", (done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: impersonatedUser, method: "POST", path: "/auth/end-impersonation"});

        interceptor.intercept(context, handler()).subscribe(() => {
            expect(auditLog.record).not.toHaveBeenCalled();
            done();
        });
    });

    it("records one audit row for a mutating request while impersonating", (done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: impersonatedUser, method: "PATCH", path: "/deals/deal-1"});

        interceptor.intercept(context, handler()).subscribe(() => {
            expect(auditLog.record).toHaveBeenCalledWith({
                actorId: "admin-1",
                actorEmail: "admin@crm.dev",
                action: AuditAction.IMPERSONATED_ACTION,
                targetType: "User",
                targetId: "target-1",
                companyId: "company-1",
                metadata: {method: "PATCH", path: "/deals/deal-1"},
            });
            done();
        });
    });

    it.each(["POST", "PATCH", "PUT", "DELETE"])("treats %s as a mutating method", (method, done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: impersonatedUser, method, path: "/deals/deal-1"});

        interceptor.intercept(context, handler()).subscribe(() => {
            expect(auditLog.record).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it("logs under the real actor (super admin), never the impersonated identity", (done) => {
        const {interceptor, auditLog} = build();
        const context = contextWith({user: impersonatedUser, method: "DELETE", path: "/leads/lead-1"});

        interceptor.intercept(context, handler()).subscribe(() => {
            const call = auditLog.record.mock.calls[0][0];
            expect(call.actorId).toBe("admin-1");
            expect(call.targetId).toBe("target-1");
            done();
        });
    });

    it("lets the underlying handler's result pass through unchanged", (done) => {
        const {interceptor} = build();
        const context = contextWith({user: impersonatedUser, method: "POST", path: "/deals"});

        interceptor.intercept(context, handler({id: "created-1"})).subscribe((result) => {
            expect(result).toEqual({id: "created-1"});
            done();
        });
    });
});
