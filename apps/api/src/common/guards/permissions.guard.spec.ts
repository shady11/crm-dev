import {ForbiddenException} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import {PermissionsGuard} from "./permissions.guard";
import {PERMISSIONS_KEY} from "@/common/decorators/permissions.decorator";

function contextWith(
    user: {isSuperAdmin?: boolean; permissions?: string[]} | undefined,
    requiredPermissions: string[] | undefined,
) {
    const handler = () => undefined;
    const target = class {};

    if (requiredPermissions !== undefined) {
        Reflect.defineMetadata(PERMISSIONS_KEY, requiredPermissions, handler);
    }

    return {
        getHandler: () => handler,
        getClass: () => target,
        switchToHttp: () => ({
            getRequest: () => ({user}),
        }),
    } as any;
}

describe("PermissionsGuard", () => {
    const guard = new PermissionsGuard(new Reflector());

    it("allows the request through when the endpoint declares no @RequirePermissions", () => {
        const context = contextWith({permissions: []}, undefined);

        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows the request through when @RequirePermissions is an empty list", () => {
        const context = contextWith({permissions: []}, []);

        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows a user who holds one of the required permissions", () => {
        const context = contextWith(
            {permissions: ["leads.view", "leads.create"]},
            ["leads.create", "leads.delete"],
        );

        expect(guard.canActivate(context)).toBe(true);
    });

    it("rejects a user who holds none of the required permissions", () => {
        const context = contextWith(
            {permissions: ["leads.view"]},
            ["leads.create", "leads.delete"],
        );

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("always allows SUPER_ADMIN, regardless of its permissions array", () => {
        const context = contextWith(
            {isSuperAdmin: true, permissions: []},
            ["rbac.manage"],
        );

        expect(guard.canActivate(context)).toBe(true);
    });

    it("rejects when the request carries no authenticated user", () => {
        const context = contextWith(undefined, ["leads.view"]);

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
