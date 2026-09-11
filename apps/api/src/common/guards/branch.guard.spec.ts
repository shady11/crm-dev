import {ForbiddenException} from "@nestjs/common";
import {BranchGuard} from "./branch.guard";
import {UserRole} from "@/generated/prisma/client";

function contextWith(user: unknown) {
    return {
        switchToHttp: () => ({getRequest: () => ({user})}),
    } as any;
}

/**
 * A pure existence check, mirroring CompanyGuard: it never filters data
 * itself, just refuses a branch-scoped role that somehow has no branch
 * assigned. It must be a no-op for company-wide roles (and SUPER_ADMIN),
 * which have no branch requirement at all.
 */
describe("BranchGuard", () => {
    const guard = new BranchGuard();

    it("rejects when there is no user on the request", () => {
        const context = contextWith(undefined);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("rejects a branch-scoped role with no branchId assigned", () => {
        const context = contextWith({role: UserRole.SALES_MANAGER, branchId: null});
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("allows a branch-scoped role that has a branchId", () => {
        const context = contextWith({role: UserRole.SALES_MANAGER, branchId: "branch-1"});
        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows SALES_HEAD with a branchId", () => {
        const context = contextWith({role: UserRole.SALES_HEAD, branchId: "branch-1"});
        expect(guard.canActivate(context)).toBe(true);
    });

    it("is a no-op for a company-wide role even with no branchId", () => {
        const context = contextWith({role: UserRole.COMPANY_ADMIN, branchId: null});
        expect(guard.canActivate(context)).toBe(true);
    });

    it("is a no-op for SUPER_ADMIN, who has no branch at all", () => {
        const context = contextWith({role: UserRole.SUPER_ADMIN, branchId: null});
        expect(guard.canActivate(context)).toBe(true);
    });
});
