import {ForbiddenException} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import {RolesGuard} from "./roles.guard";
import {ROLES_KEY} from "@/common/decorators/roles.decorator";
import {UserRole} from "@/generated/prisma/client";

function contextWith(user: {role: UserRole} | undefined, requiredRoles: UserRole[] | undefined) {
    const handler = () => undefined;
    const target = class {};

    if (requiredRoles !== undefined) {
        Reflect.defineMetadata(ROLES_KEY, requiredRoles, handler);
    }

    return {
        getHandler: () => handler,
        getClass: () => target,
        switchToHttp: () => ({
            getRequest: () => ({user}),
        }),
    } as any;
}

describe("RolesGuard", () => {
    const guard = new RolesGuard(new Reflector());

    it("allows the request through when the endpoint declares no @Roles", () => {
        const context = contextWith({role: UserRole.SALES_MANAGER}, undefined);

        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows the request through when @Roles is an empty list", () => {
        const context = contextWith({role: UserRole.SALES_MANAGER}, []);

        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows a user whose role is in the required list", () => {
        const context = contextWith(
            {role: UserRole.COMPANY_ADMIN},
            [UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD],
        );

        expect(guard.canActivate(context)).toBe(true);
    });

    it("rejects a user whose role is not in the required list", () => {
        const context = contextWith(
            {role: UserRole.FINANCE},
            [UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD],
        );

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("rejects when the request carries no authenticated user", () => {
        const context = contextWith(undefined, [UserRole.COMPANY_ADMIN]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
