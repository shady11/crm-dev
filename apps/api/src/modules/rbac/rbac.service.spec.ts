import {BadRequestException, ForbiddenException, NotFoundException} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
import {UserRole} from "@/generated/prisma/client";
import {RbacService} from "./rbac.service";

/**
 * RbacService is the entire access-control layer's source of truth: every
 * @RequirePermissions() guard check ultimately depends on
 * getEffectivePermissions returning the right set, and every role mutation
 * has to respect two boundaries — system roles are read-only, and a
 * COMPANY_ADMIN can never reach into another tenant's roles or users.
 */
describe("RbacService", () => {
    const companyAdmin: AuthUser = {
        id: "admin-1",
        email: "admin@crm.dev",
        name: "Admin",
        role: UserRole.COMPANY_ADMIN,
        companyId: "company-1",
        company: null,
        branchId: null,
        branch: null,
    };

    const superAdmin: AuthUser = {
        id: "super-1",
        email: "ops@crm.dev",
        name: "Ops",
        role: UserRole.SUPER_ADMIN,
        companyId: null,
        company: null,
        branchId: null,
        branch: null,
    };

    function build() {
        const prisma = {
            permission: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            role: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
                create: jest.fn().mockImplementation(({data}: any) => Promise.resolve({id: "role-new", ...data})),
                update: jest.fn().mockImplementation(({data}: any) => Promise.resolve({id: "role-1", ...data})),
                delete: jest.fn(),
            },
            rolePermission: {
                deleteMany: jest.fn(),
                createMany: jest.fn(),
            },
            userRoleAssignment: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn(),
                deleteMany: jest.fn(),
                createMany: jest.fn(),
            },
            user: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
        };

        const service = new RbacService(prisma as any);
        return {service, prisma};
    }

    describe("getEffectivePermissions", () => {
        it("unions permissions across every Role assigned to the user, de-duplicated", async () => {
            const {service, prisma} = build();
            prisma.userRoleAssignment.findMany.mockResolvedValue([
                {role: {permissions: [{permission: {key: "leads.view"}}, {permission: {key: "leads.create"}}]}},
                {role: {permissions: [{permission: {key: "leads.view"}}, {permission: {key: "deals.view"}}]}},
            ]);

            const permissions = await service.getEffectivePermissions("user-1");

            expect(permissions.sort()).toEqual(["deals.view", "leads.create", "leads.view"]);
        });

        it("returns an empty array for a user with no Role assignments", async () => {
            const {service} = build();
            await expect(service.getEffectivePermissions("user-1")).resolves.toEqual([]);
        });
    });

    describe("createRole", () => {
        it("rejects an unknown permission key", async () => {
            const {service} = build();
            await expect(
                service.createRole(companyAdmin, {name: "Auditor", permissionKeys: ["not.a.real.permission"]}),
            ).rejects.toThrow(BadRequestException);
        });

        it("scopes a COMPANY_ADMIN's new role to their own company", async () => {
            const {service, prisma} = build();
            await service.createRole(companyAdmin, {name: "Auditor", permissionKeys: []});

            expect(prisma.role.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({companyId: "company-1", isSystem: false}),
                }),
            );
        });

        it("creates a SUPER_ADMIN's new role as a global custom role (companyId null)", async () => {
            const {service, prisma} = build();
            await service.createRole(superAdmin, {name: "Auditor", permissionKeys: []});

            expect(prisma.role.create).toHaveBeenCalledWith(
                expect.objectContaining({data: expect.objectContaining({companyId: null})}),
            );
        });
    });

    describe("system role protection", () => {
        const systemRole = {
            id: "role-system",
            name: "Sales Head",
            isSystem: true,
            companyId: null,
        };

        it("refuses to rename a system role", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(systemRole);

            await expect(
                service.updateRole(companyAdmin, "role-system", {name: "Renamed"}),
            ).rejects.toThrow(ForbiddenException);
        });

        it("refuses to change a system role's permissions", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(systemRole);

            await expect(
                service.setRolePermissions(companyAdmin, "role-system", ["leads.view"]),
            ).rejects.toThrow(ForbiddenException);
        });

        it("refuses to delete a system role", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(systemRole);

            await expect(service.deleteRole(companyAdmin, "role-system")).rejects.toThrow(ForbiddenException);
        });
    });

    describe("tenant isolation", () => {
        const otherCompanysRole = {
            id: "role-other",
            name: "Their Custom Role",
            isSystem: false,
            companyId: "company-2",
        };

        it("hides another company's custom role behind NotFoundException", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(otherCompanysRole);

            await expect(
                service.updateRole(companyAdmin, "role-other", {name: "Hijacked"}),
            ).rejects.toThrow(NotFoundException);
        });

        it("refuses to assign a user outside the actor's company", async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue({id: "user-2", companyId: "company-2"});

            await expect(
                service.assignRoleToUser(companyAdmin, "user-2", "role-1"),
            ).rejects.toThrow(NotFoundException);
        });

        it("lets a SUPER_ADMIN reach any company's role", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(otherCompanysRole);

            await expect(
                service.updateRole(superAdmin, "role-other", {name: "Still theirs"}),
            ).resolves.toBeDefined();
        });
    });

    describe("listRoleUserIds", () => {
        it("scopes a COMPANY_ADMIN's lookup to their own company's users", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue({id: "role-1", companyId: "company-1", isSystem: false});
            prisma.userRoleAssignment.findMany.mockResolvedValue([{userId: "u1"}, {userId: "u2"}]);

            await service.listRoleUserIds(companyAdmin, "role-1");

            expect(prisma.userRoleAssignment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({roleId: "role-1", user: {companyId: "company-1"}}),
                }),
            );
        });
    });
});
