import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { AuthUser } from "@/common/types/auth-user.type";
import { UserRole } from "@/generated/prisma/client";
import { PERMISSIONS_CATALOG, PERMISSION_KEYS } from "./permissions.catalog";
import { DEFAULT_ROLE_PERMISSIONS } from "./default-role-permissions";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

// Human-readable names for the system Role seeded per legacy UserRole.
const SYSTEM_ROLE_NAMES: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    COMPANY_ADMIN: "Company Admin",
    SALES_HEAD: "Sales Head",
    SALES_MANAGER: "Sales Manager",
    FINANCE: "Finance",
};

@Injectable()
export class RbacService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Idempotently brings the database in line with the code-defined catalog
     * and default role bundles. Runs on every boot (and from prisma/seed.ts)
     * so a fresh environment, and one that's been running for months, both
     * end up with the same baseline — new permissions in the catalog appear
     * automatically, existing rows are never touched.
     */
    async onModuleInit() {
        await this.syncCatalog();
        await this.syncSystemRoles();
        await this.backfillUserRoleAssignments();
    }

    async syncCatalog(): Promise<void> {
        for (const permission of PERMISSIONS_CATALOG) {
            await this.prisma.permission.upsert({
                where: { key: permission.key },
                update: {
                    module: permission.module,
                    action: permission.action,
                    description: permission.description,
                },
                create: permission,
            });
        }
    }

    async syncSystemRoles(): Promise<void> {
        for (const [role, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [
            UserRole,
            string[],
        ][]) {
            // Not `role.upsert` with a companyId_name where clause: Prisma
            // refuses null in a compound unique lookup at runtime (it can't
            // express "companyId IS NULL AND name = ..." through that key),
            // even though the schema's own unique index treats companyId
            // and name together, nulls included. find-then-create/update
            // instead.
            const existing = await this.prisma.role.findFirst({
                where: { companyId: null, name: SYSTEM_ROLE_NAMES[role] },
            });
            const systemRole = existing
                ? existing
                : await this.prisma.role.create({
                      data: {
                          name: SYSTEM_ROLE_NAMES[role],
                          description: `Built-in role matching the legacy "${role}" access level.`,
                          isSystem: true,
                          companyId: null,
                      },
                  });

            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: permissionKeys } },
                select: { id: true, key: true },
            });

            // Replace wholesale: this is the source-controlled definition of
            // the system role, so it should always match DEFAULT_ROLE_PERMISSIONS
            // exactly rather than drift from stale rows.
            await this.prisma.rolePermission.deleteMany({ where: { roleId: systemRole.id } });
            await this.prisma.rolePermission.createMany({
                data: permissions.map((p) => ({ roleId: systemRole.id, permissionId: p.id })),
            });
        }
    }

    /**
     * Every user without a single Role assignment yet (a fresh environment,
     * or a user created before this module existed) is given the system
     * role matching their legacy `role` enum column — so access doesn't
     * change the moment this module ships. Safe to call repeatedly: a user
     * who already has at least one Role assignment is left untouched, even
     * if it no longer matches their `role` column.
     */
    async backfillUserRoleAssignments(): Promise<number> {
        const users = await this.prisma.user.findMany({
            where: { roleAssignments: { none: {} } },
            select: { id: true, role: true },
        });

        if (users.length === 0) {
            return 0;
        }

        const systemRoles = await this.prisma.role.findMany({
            where: { isSystem: true, companyId: null },
            select: { id: true, name: true },
        });
        const roleIdByUserRole = new Map(
            (Object.entries(SYSTEM_ROLE_NAMES) as [UserRole, string][])
                .map(([userRole, name]) => [userRole, systemRoles.find((r) => r.name === name)?.id])
                .filter((entry): entry is [UserRole, string] => Boolean(entry[1])),
        );

        const rows = users
            .map((u) => ({ userId: u.id, roleId: roleIdByUserRole.get(u.role) }))
            .filter((row): row is { userId: string; roleId: string } => Boolean(row.roleId));

        if (rows.length === 0) {
            return 0;
        }

        await this.prisma.userRoleAssignment.createMany({ data: rows, skipDuplicates: true });
        return rows.length;
    }

    async getEffectivePermissions(userId: string): Promise<string[]> {
        const assignments = await this.prisma.userRoleAssignment.findMany({
            where: { userId },
            select: {
                role: {
                    select: { permissions: { select: { permission: { select: { key: true } } } } },
                },
            },
        });

        const keys = new Set<string>();
        for (const { role } of assignments) {
            for (const { permission } of role.permissions) {
                keys.add(permission.key);
            }
        }

        return Array.from(keys);
    }

    listPermissions() {
        return this.prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    }

    /**
     * Roles a caller may see: the shared system roles, every global custom
     * role (companyId null, isSystem false — SUPER_ADMIN-authored, offered
     * to every tenant), and, for a tenant actor, that tenant's own custom
     * roles.
     */
    async listRoles(actor: AuthUser) {
        const roles = await this.prisma.role.findMany({
            where:
                actor.role === UserRole.SUPER_ADMIN
                    ? { companyId: null }
                    : { OR: [{ companyId: null }, { companyId: actor.companyId }] },
            include: {
                permissions: { select: { permission: { select: { key: true } } } },
            },
            orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        });

        // Not `_count`/`include: { users }` on the Role query above: a system
        // or global custom role's UserRoleAssignment rows span every tenant
        // that uses it, and a COMPANY_ADMIN must only ever see their own
        // company's slice of that — otherwise this leaks another company's
        // user count and names for a shared role. Scoped explicitly here
        // instead, and capped to a handful per role for the card grid's
        // avatar preview rather than fetching every assignee.
        const SAMPLE_SIZE = 4;
        const assignments = await this.prisma.userRoleAssignment.findMany({
            where: {
                roleId: { in: roles.map((r) => r.id) },
                user: actor.role === UserRole.SUPER_ADMIN ? {} : { companyId: actor.companyId },
            },
            select: { roleId: true, user: { select: { id: true, fullName: true } } },
        });

        const usersByRole = new Map<string, { id: string; fullName: string }[]>();
        for (const a of assignments) {
            const list = usersByRole.get(a.roleId) ?? [];
            list.push(a.user);
            usersByRole.set(a.roleId, list);
        }

        return roles.map((r) => {
            const users = usersByRole.get(r.id) ?? [];

            return {
                id: r.id,
                name: r.name,
                description: r.description,
                isSystem: r.isSystem,
                companyId: r.companyId,
                userCount: users.length,
                sample: users.slice(0, SAMPLE_SIZE),
                permissionKeys: r.permissions.map((p) => p.permission.key),
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            };
        });
    }

    private async getVisibleRole(actor: AuthUser, roleId: string) {
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });

        if (!role) {
            throw new NotFoundException("Role not found");
        }

        const visible =
            role.companyId === null ||
            actor.role === UserRole.SUPER_ADMIN ||
            role.companyId === actor.companyId;

        if (!visible) {
            throw new NotFoundException("Role not found");
        }

        return role;
    }

    private assertPermissionKeysExist(permissionKeys: string[]) {
        const invalid = permissionKeys.filter((k) => !PERMISSION_KEYS.includes(k));

        if (invalid.length > 0) {
            throw new BadRequestException(`Unknown permission key(s): ${invalid.join(", ")}`);
        }
    }

    /**
     * COMPANY_ADMIN creates a role scoped to their own tenant. SUPER_ADMIN
     * creates a global custom role, offered to every tenant alongside the
     * built-in system roles — the platform-level "add a new role" path.
     */
    async createRole(actor: AuthUser, dto: CreateRoleDto) {
        this.assertPermissionKeysExist(dto.permissionKeys);

        const companyId = actor.role === UserRole.SUPER_ADMIN ? null : actor.companyId;

        if (companyId === undefined) {
            throw new ForbiddenException("Actor has no company to scope this role to");
        }

        const permissions = await this.prisma.permission.findMany({
            where: { key: { in: dto.permissionKeys } },
            select: { id: true },
        });

        return this.prisma.role.create({
            data: {
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                isSystem: false,
                companyId,
                permissions: {
                    create: permissions.map((p) => ({ permissionId: p.id })),
                },
            },
            include: { permissions: { select: { permission: { select: { key: true } } } } },
        });
    }

    async updateRole(actor: AuthUser, roleId: string, dto: UpdateRoleDto) {
        const role = await this.getVisibleRole(actor, roleId);

        if (role.isSystem) {
            throw new ForbiddenException("System roles cannot be renamed");
        }

        if (role.companyId !== null && role.companyId !== actor.companyId && actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Cannot edit another company's role");
        }

        return this.prisma.role.update({
            where: { id: roleId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
            },
        });
    }

    async setRolePermissions(actor: AuthUser, roleId: string, permissionKeys: string[]) {
        this.assertPermissionKeysExist(permissionKeys);
        const role = await this.getVisibleRole(actor, roleId);

        if (role.isSystem) {
            throw new ForbiddenException(
                "System roles' permissions are fixed — clone one into a custom role to adjust it",
            );
        }

        if (role.companyId !== null && role.companyId !== actor.companyId && actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Cannot edit another company's role");
        }

        const permissions = await this.prisma.permission.findMany({
            where: { key: { in: permissionKeys } },
            select: { id: true },
        });

        await this.prisma.$transaction([
            this.prisma.rolePermission.deleteMany({ where: { roleId } }),
            this.prisma.rolePermission.createMany({
                data: permissions.map((p) => ({ roleId, permissionId: p.id })),
            }),
        ]);

        return this.getVisibleRole(actor, roleId);
    }

    async deleteRole(actor: AuthUser, roleId: string) {
        const role = await this.getVisibleRole(actor, roleId);

        if (role.isSystem) {
            throw new ForbiddenException("System roles cannot be deleted");
        }

        if (role.companyId !== null && role.companyId !== actor.companyId && actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Cannot delete another company's role");
        }

        await this.prisma.role.delete({ where: { id: roleId } });
    }

    private async assertUserInScope(actor: AuthUser, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, companyId: true },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (actor.role !== UserRole.SUPER_ADMIN && user.companyId !== actor.companyId) {
            throw new NotFoundException("User not found");
        }

        return user;
    }

    async listUserRoles(actor: AuthUser, userId: string) {
        await this.assertUserInScope(actor, userId);

        const assignments = await this.prisma.userRoleAssignment.findMany({
            where: { userId },
            include: { role: { select: { id: true, name: true, isSystem: true, companyId: true } } },
        });

        return {
            roles: assignments.map((a) => a.role),
            permissions: await this.getEffectivePermissions(userId),
        };
    }

    /** The ids of every user in scope for `actor` who currently holds `roleId` — backs the "who has this role" picker. */
    async listRoleUserIds(actor: AuthUser, roleId: string): Promise<string[]> {
        await this.getVisibleRole(actor, roleId);

        const assignments = await this.prisma.userRoleAssignment.findMany({
            where: {
                roleId,
                user: actor.role === UserRole.SUPER_ADMIN ? {} : { companyId: actor.companyId },
            },
            select: { userId: true },
        });

        return assignments.map((a) => a.userId);
    }

    async assignRoleToUser(actor: AuthUser, userId: string, roleId: string) {
        await this.assertUserInScope(actor, userId);
        await this.getVisibleRole(actor, roleId);

        await this.prisma.userRoleAssignment.upsert({
            where: { userId_roleId: { userId, roleId } },
            update: {},
            create: { userId, roleId },
        });

        return this.listUserRoles(actor, userId);
    }

    async revokeRoleFromUser(actor: AuthUser, userId: string, roleId: string) {
        await this.assertUserInScope(actor, userId);

        await this.prisma.userRoleAssignment.deleteMany({ where: { userId, roleId } });

        return this.listUserRoles(actor, userId);
    }
}
