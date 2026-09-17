import {BadRequestException, ConflictException, ForbiddenException, NotFoundException} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
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
        roleId: "role-company-admin",
        roleName: "Company Admin",
        companyId: "company-1",
        company: null,
        branchId: null,
        branch: null,
    };

    const superAdmin: AuthUser = {
        id: "super-1",
        email: "ops@crm.dev",
        name: "Ops",
        roleId: "role-super-admin",
        roleName: "Super Admin",
        isSuperAdmin: true,
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
            user: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn(),
                count: jest.fn().mockResolvedValue(0),
            },
            $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
        };

        const service = new RbacService(prisma as any);
        return {service, prisma};
    }

    describe("getEffectivePermissions", () => {
        it("returns the user's Role's permission set", async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue({
                role: {permissions: [{permission: {key: "leads.view"}}, {permission: {key: "leads.create"}}]},
            });

            const permissions = await service.getEffectivePermissions("user-1");

            expect(permissions.sort()).toEqual(["leads.create", "leads.view"]);
        });

        it("returns an empty array when the user no longer exists", async () => {
            const {service, prisma} = build();
            prisma.user.findUnique.mockResolvedValue(null);
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

    describe("deleteRole", () => {
        it("refuses to delete a custom role that users still hold", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue({
                id: "role-custom",
                name: "Auditor",
                isSystem: false,
                companyId: "company-1",
            });
            prisma.user.count.mockResolvedValue(3);

            await expect(service.deleteRole(companyAdmin, "role-custom")).rejects.toThrow(ConflictException);
            expect(prisma.role.delete).not.toHaveBeenCalled();
        });

        it("deletes a custom role with no holders", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue({
                id: "role-custom",
                name: "Auditor",
                isSystem: false,
                companyId: "company-1",
            });
            prisma.user.count.mockResolvedValue(0);

            await service.deleteRole(companyAdmin, "role-custom");
            expect(prisma.role.delete).toHaveBeenCalledWith({where: {id: "role-custom"}});
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

        it("lets a SUPER_ADMIN reach any company's role", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue(otherCompanysRole);

            await expect(
                service.updateRole(superAdmin, "role-other", {name: "Still theirs"}),
            ).resolves.toBeDefined();
        });
    });

    describe("listRoleMembers", () => {
        it("scopes a COMPANY_ADMIN's lookup to their own company's users", async () => {
            const {service, prisma} = build();
            prisma.role.findUnique.mockResolvedValue({id: "role-1", companyId: "company-1", isSystem: false});
            prisma.user.findMany.mockResolvedValue([{id: "u1", fullName: "A", email: "a@crm.dev"}]);

            await service.listRoleMembers(companyAdmin, "role-1");

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {roleId: "role-1", companyId: "company-1"},
                }),
            );
        });
    });
});
