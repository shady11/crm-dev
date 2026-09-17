import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { AuthUser } from "@/common/types/auth-user.type";
import { PERMISSIONS_CATALOG, PERMISSION_KEYS } from "./permissions.catalog";
import { BRANCH_SCOPED_SYSTEM_ROLES, DEFAULT_ROLE_PERMISSIONS } from "./default-role-permissions";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RbacService implements OnModuleInit {
    // Populated by syncSystemRoles on boot; read by getSystemRoleId so the
    // handful of places that still need to find users by a specific legacy
    // role (branch/discount lookups, "notify the sales head" queries) don't
    // each re-query Role by name.
    private readonly systemRoleIdsByName = new Map<string, string>();

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
        for (const [name, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
            // Not `role.upsert` with a companyId_name where clause: Prisma
            // refuses null in a compound unique lookup at runtime (it can't
            // express "companyId IS NULL AND name = ..." through that key),
            // even though the schema's own unique index treats companyId
            // and name together, nulls included. find-then-create/update
            // instead.
            const existing = await this.prisma.role.findFirst({
                where: { companyId: null, name },
            });
            const isBranchScoped = BRANCH_SCOPED_SYSTEM_ROLES.includes(name);
            const systemRole = existing
                ? await this.prisma.role.update({
                      where: { id: existing.id },
                      data: { isBranchScoped },
                  })
                : await this.prisma.role.create({
                      data: {
                          name,
                          description: `Built-in role matching the legacy "${name}" access level.`,
                          isSystem: true,
                          isBranchScoped,
                          companyId: null,
                      },
                  });

            this.systemRoleIdsByName.set(name, systemRole.id);

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
     * The id of a seeded system Role by its exact name (see
     * legacy-role-names.ts) — for the handful of places still tied to a
     * specific legacy role rather than a permission. Throws rather than
     * returning undefined: every name in LEGACY_ROLE_NAMES is guaranteed
     * seeded by syncSystemRoles before the app finishes booting, so a miss
     * here means that invariant broke, not a normal "not found".
     */
    async getSystemRoleId(name: string): Promise<string> {
        const cached = this.systemRoleIdsByName.get(name);
        if (cached) return cached;

        const role = await this.prisma.role.findFirst({ where: { companyId: null, name } });
        if (!role) {
            throw new Error(`System role "${name}" not found — has RbacService.syncSystemRoles run?`);
        }

        this.systemRoleIdsByName.set(name, role.id);
        return role.id;
    }

    async getEffectivePermissions(userId: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
        });

        if (!user) return [];

        return user.role.permissions.map((p) => p.permission.key);
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
            where: actor.isSuperAdmin ? { companyId: null } : { OR: [{ companyId: null }, { companyId: actor.companyId }] },
            include: {
                permissions: { select: { permission: { select: { key: true } } } },
            },
            orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        });

        // Not `_count`/`include: { users }` on the Role query above: a
        // system or global custom role's users span every tenant that uses
        // it, and a COMPANY_ADMIN must only ever see their own company's
        // slice of that — otherwise this leaks another company's user count
        // and names for a shared role. Scoped explicitly here instead, and
        // capped to a handful per role for the card grid's avatar preview
        // rather than fetching every holder.
        const SAMPLE_SIZE = 4;
        const holders = await this.prisma.user.findMany({
            where: {
                roleId: { in: roles.map((r) => r.id) },
                ...(actor.isSuperAdmin ? {} : { companyId: actor.companyId }),
            },
            select: { id: true, fullName: true, roleId: true },
        });

        const usersByRole = new Map<string, { id: string; fullName: string }[]>();
        for (const holder of holders) {
            const list = usersByRole.get(holder.roleId) ?? [];
            list.push({ id: holder.id, fullName: holder.fullName });
            usersByRole.set(holder.roleId, list);
        }

        return roles.map((r) => {
            const users = usersByRole.get(r.id) ?? [];

            return {
                id: r.id,
                name: r.name,
                description: r.description,
                isSystem: r.isSystem,
                isBranchScoped: r.isBranchScoped,
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

        const visible = role.companyId === null || actor.isSuperAdmin || role.companyId === actor.companyId;

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

        const companyId = actor.isSuperAdmin ? null : actor.companyId;

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

        if (role.companyId !== null && role.companyId !== actor.companyId && !actor.isSuperAdmin) {
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

        if (role.companyId !== null && role.companyId !== actor.companyId && !actor.isSuperAdmin) {
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

        if (role.companyId !== null && role.companyId !== actor.companyId && !actor.isSuperAdmin) {
            throw new ForbiddenException("Cannot delete another company's role");
        }

        // Every user has exactly one Role (User.roleId, required) — the DB's
        // own RESTRICT foreign key would refuse this anyway, but a clear
        // ConflictException beats a raw constraint-violation error reaching
        // the client.
        const holderCount = await this.prisma.user.count({ where: { roleId } });
        if (holderCount > 0) {
            throw new ConflictException(
                `${holderCount} user(s) still have this role — reassign them to another role first`,
            );
        }

        await this.prisma.role.delete({ where: { id: roleId } });
    }

    /** Every user in scope for `actor` who currently holds `roleId` — backs the "who has this role" panel. */
    async listRoleMembers(actor: AuthUser, roleId: string) {
        await this.getVisibleRole(actor, roleId);

        return this.prisma.user.findMany({
            where: {
                roleId,
                ...(actor.isSuperAdmin ? {} : { companyId: actor.companyId }),
            },
            select: { id: true, fullName: true, email: true },
            orderBy: { fullName: "asc" },
        });
    }
}
