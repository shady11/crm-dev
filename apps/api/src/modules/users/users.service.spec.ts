import {ForbiddenException, NotFoundException} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/client";
import {AuthUser} from "@/common/types/auth-user.type";
import {PrismaService} from "@/database/prisma.service";
import {UsersService} from "./users.service";

/**
 * Guards the privilege boundary: a COMPANY_ADMIN administers their own company
 * and must never be able to reach a SUPER_ADMIN — not by creating one, not by
 * promoting into one, and not by acting on an existing one.
 *
 * These are pure authorisation checks, so Prisma is stubbed rather than run.
 */
describe("UsersService — role boundaries", () => {
    const admin: AuthUser = {
        id: "admin-1",
        email: "admin@crm.dev",
        name: "Company Admin",
        role: UserRole.COMPANY_ADMIN,
        companyId: "company-1",
    };

    const superAdminRow = {
        id: "super-1",
        role: UserRole.SUPER_ADMIN,
        companyId: "company-1",
        email: "root@crm.dev",
        isActive: true,
        deletedAt: null,
    };

    const managerRow = {...superAdminRow, id: "manager-1", role: UserRole.SALES_MANAGER};

    /** `found` is what user.findFirst resolves to for the target lookup. */
    const build = (found: unknown = null) => {
        const prisma = {
            user: {
                findFirst: jest.fn().mockResolvedValue(found),
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockResolvedValue({id: "new"}),
                update: jest.fn().mockResolvedValue({id: "updated"}),
            },
        };
        return {service: new UsersService(prisma as unknown as PrismaService), prisma};
    };

    describe("create", () => {
        it("refuses to mint a SUPER_ADMIN", async () => {
            const {service, prisma} = build();

            await expect(
                service.create(admin, {
                    fullName: "Root",
                    email: "root@crm.dev",
                    password: "secret123",
                    role: UserRole.SUPER_ADMIN,
                }),
            ).rejects.toThrow(ForbiddenException);

            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it("allows the roles a company admin does manage", async () => {
            const {service, prisma} = build();

            await service.create(admin, {
                fullName: "Aigul",
                email: "aigul@crm.dev",
                password: "secret123",
                role: UserRole.SALES_MANAGER,
            });

            expect(prisma.user.create).toHaveBeenCalled();
        });
    });

    describe("update", () => {
        it("refuses to promote an existing user to SUPER_ADMIN", async () => {
            const {service, prisma} = build(managerRow);

            await expect(
                service.update(admin, managerRow.id, {role: UserRole.SUPER_ADMIN}),
            ).rejects.toThrow(ForbiddenException);

            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it("hides an existing SUPER_ADMIN behind a 404 rather than a 403", async () => {
            // 403 would confirm the account exists; a company admin should not
            // be able to discover one by probing ids.
            const {service} = build(superAdminRow);

            await expect(
                service.update(admin, superAdminRow.id, {fullName: "Renamed"}),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("acting on a target", () => {
        it.each([
            ["updatePassword", (s: UsersService) => s.updatePassword(admin, superAdminRow.id, {password: "newsecret"})],
            ["revokeSessions", (s: UsersService) => s.revokeSessions(admin, superAdminRow.id)],
            ["remove", (s: UsersService) => s.remove(admin, superAdminRow.id)],
        ])("%s cannot touch a SUPER_ADMIN", async (_name, call) => {
            const {service, prisma} = build(superAdminRow);

            await expect(call(service)).rejects.toThrow(NotFoundException);
            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it("excludes already soft-deleted users from the lookup", async () => {
            const {service, prisma} = build(managerRow);

            await service.revokeSessions(admin, managerRow.id);

            expect(prisma.user.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({deletedAt: null}),
                }),
            );
        });
    });

    describe("findAll", () => {
        it("scopes the query to manageable roles and excludes deleted users", async () => {
            const {service, prisma} = build();

            await service.findAll(admin, {});

            const where = prisma.user.findMany.mock.calls[0][0].where;
            expect(where.deletedAt).toBeNull();
            expect(where.role.in).not.toContain(UserRole.SUPER_ADMIN);
            expect(where.role.in).toContain(UserRole.SALES_MANAGER);
        });

        it("refuses an explicit filter on a role the actor cannot see", async () => {
            const {service} = build();

            await expect(service.findAll(admin, {role: UserRole.SUPER_ADMIN}))
                .rejects.toThrow(ForbiddenException);
        });
    });
});
