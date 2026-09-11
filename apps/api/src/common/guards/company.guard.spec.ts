import {ForbiddenException} from "@nestjs/common";
import {CompanyGuard} from "./company.guard";
import {UserRole} from "@/generated/prisma/client";

function contextWith(user: unknown) {
    return {
        switchToHttp: () => ({getRequest: () => ({user})}),
    } as any;
}

/**
 * A pure existence check applied ahead of BranchGuard in the stack: every
 * route it protects requires a tenant-scoped user, so a SUPER_ADMIN (who has
 * no companyId) or an unauthenticated request must be refused here, before
 * any service method's own companyId check even runs.
 */
describe("CompanyGuard", () => {
    const guard = new CompanyGuard();

    it("rejects when there is no user on the request", () => {
        const context = contextWith(undefined);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("rejects a user with no companyId (e.g. SUPER_ADMIN)", () => {
        const context = contextWith({role: UserRole.SUPER_ADMIN, companyId: null});
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("allows a user with a companyId", () => {
        const context = contextWith({role: UserRole.COMPANY_ADMIN, companyId: "company-1"});
        expect(guard.canActivate(context)).toBe(true);
    });
});
