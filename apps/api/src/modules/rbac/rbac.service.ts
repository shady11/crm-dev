import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common";
import { AuditAction } from "@/generated/prisma/client";
import { PrismaService } from "@/database/prisma.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { AuthUser } from "@/common/types/auth-user.type";
import { PERMISSIONS_CATALOG, PERMISSION_KEYS } from "./permissions.catalog";
import { DEFAULT_ROLES } from "./default-role-permissions";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RbacService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) {}

    /**
     * Idempotently brings the database in line with the code-defined
     * permission catalog, and seeds the five built-in roles the first time
     * this ever runs against a database. Runs on every boot (and from
     * prisma/seed.ts and the provisioning scripts) so a fresh environment
     * ends up with a working baseline — but, unlike the permission catalog,
     * a role that already exists is never touched again after it's
     * created: once seeded, a role is just an ordinary Role row a platform
     * administrator can freely rename, re-permission, or delete, and this
     * method must never fight that by resetting it back to its defaults on
     * the next boot.
     */
    async onModuleInit() {
        await this.syncCatalog();
        await this.seedDefaultRolesIfMissing();
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

    async seedDefaultRolesIfMissing(): Promise<void> {
        for (const seed of DEFAULT_ROLES) {
            // Not `role.upsert` with a companyId_name where clause: Prisma
            // refuses null in a compound unique lookup at runtime (it can't
            // express "companyId IS NULL AND name = ..." through that key),
            // even though the schema's own unique index treats companyId
            // and name together, nulls included.
            const existing = await this.prisma.role.findFirst({
                where: { companyId: null, name: seed.name },
            });

            if (existing) continue;

            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: seed.permissionKeys } },
                select: { id: true },
            });

            const role = await this.prisma.role.create({
                data: {
                    name: seed.name,
                    description: seed.description,
                    isSystem: true,
                    isBranchScoped: seed.isBranchScoped ?? false,
                    discountLimit: seed.discountLimit ?? null,
                    isDefaultCompanyAdmin: seed.isDefaultCompanyAdmin ?? false,
                    isPlatformRole: seed.isPlatformRole ?? false,
                    companyId: null,
                },
            });

            await this.prisma.rolePermission.createMany({
                data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
            });
        }
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
     * Ids of roles visible in `companyId`'s scope that grant `includeKey`
     * and, when given, do not also grant `excludeKey` — the general
     * "individual contributor with this capability, not also a team lead"
     * pattern used to find valid reassignment/snapshot targets without
     * naming a role. See DealsService.reassignManager, LeadsService's
     * SH-A1 reassignment, and DashboardService.getTeamSnapshot.
     */
    async findRoleIdsWithPermission(companyId: string, includeKey: string, excludeKey?: string): Promise<string[]> {
        const roles = await this.prisma.role.findMany({
            where: {
                OR: [{ companyId: null }, { companyId }],
                permissions: { some: { permission: { key: includeKey } } },
            },
            select: {
                id: true,
                permissions: { select: { permission: { select: { key: true } } } },
            },
        });

        if (!excludeKey) return roles.map((r) => r.id);

        return roles
            .filter((r) => !r.permissions.some((p) => p.permission.key === excludeKey))
            .map((r) => r.id);
    }

    /**
     * Roles visible in `companyId`'s scope that grant `permissionKey`, with
     * enough shape (own discount ceiling, branch scoping) for
     * DealsService to work out who should be asked to decide a pending
     * discount request without naming a role.
     */
    async findApproverRoles(companyId: string, permissionKey: string) {
        return this.prisma.role.findMany({
            where: {
                OR: [{ companyId: null }, { companyId }],
                permissions: { some: { permission: { key: permissionKey } } },
            },
            select: { id: true, isBranchScoped: true, discountLimit: true },
        });
    }

    /**
     * The role a brand-new tenant's first administrator is assigned — see
     * CompaniesService.create. Exactly one global role should carry this
     * flag; seeded onto "Company Admin" and never touched again afterward.
     */
    async findDefaultCompanyAdminRoleId(): Promise<string> {
        const role = await this.prisma.role.findFirst({
            where: { isDefaultCompanyAdmin: true },
            select: { id: true },
        });

        if (!role) {
            throw new Error("No role is marked isDefaultCompanyAdmin — has RbacService.seedDefaultRolesIfMissing run?");
        }

        return role.id;
    }

    /**
     * Roles a caller may see: every global role (companyId null — the
     * built-in roles plus any a SUPER_ADMIN has added) and, for a tenant
     * actor, that tenant's own custom roles. The platform role
     * (isPlatformRole — "Super Admin") is never shown to a tenant actor:
     * it grants no permissions of its own (SUPER_ADMIN bypasses the
     * permission system entirely via User.isSuperAdmin) and is never
     * assignable to one of their users — see UsersService.ensureCanAssignRole
     * — so surfacing it here would only expose who else runs the platform.
     */
    async listRoles(actor: AuthUser) {
        const roles = await this.prisma.role.findMany({
            where: actor.isSuperAdmin
                ? { companyId: null }
                : { isPlatformRole: false, OR: [{ companyId: null }, { companyId: actor.companyId }] },
            include: {
                permissions: { select: { permission: { select: { key: true } } } },
            },
            orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        });

        // Not `_count`/`include: { users }` on the Role query above: a
        // global role's users span every tenant that uses it, and a
        // COMPANY_ADMIN must only ever see their own company's slice of
        // that — otherwise this leaks another company's user count and
        // names for a shared role. Scoped explicitly here instead, and
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
                discountLimit: r.discountLimit === null ? null : r.discountLimit.toNumber(),
                // Read-only, never part of Create/UpdateRoleDto: a UI-facing
                // marker for the one role Users pages must never offer as
                // assignable — see UsersService.ensureCanAssignRole.
                isPlatformRole: r.isPlatformRole,
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

        // The platform role is never visible to a tenant actor, by id or
        // otherwise — same reasoning as listRoles above.
        if (role.isPlatformRole && !actor.isSuperAdmin) {
            throw new NotFoundException("Role not found");
        }

        const visible = role.companyId === null || actor.isSuperAdmin || role.companyId === actor.companyId;

        if (!visible) {
            throw new NotFoundException("Role not found");
        }

        return role;
    }

    /**
     * A global role (companyId null) may only be managed by a platform
     * administrator; a tenant's own custom role only by that tenant (or a
     * platform administrator). Shared by updateRole/setRolePermissions/
     * deleteRole below — the three mutations that used to also check
     * `role.isSystem` and refuse outright. That lock is gone: a global role
     * is otherwise exactly as editable as a custom one, just scoped to
     * whoever may touch the global namespace.
     */
    private assertCanManageRole(actor: AuthUser, role: { companyId: string | null }) {
        if (role.companyId === null) {
            if (!actor.isSuperAdmin) {
                throw new ForbiddenException("Only a platform administrator can manage a global role");
            }
            return;
        }

        if (role.companyId !== actor.companyId && !actor.isSuperAdmin) {
            throw new ForbiddenException("Cannot manage another company's role");
        }
    }

    private assertPermissionKeysExist(permissionKeys: string[]) {
        const invalid = permissionKeys.filter((k) => !PERMISSION_KEYS.includes(k));

        if (invalid.length > 0) {
            throw new BadRequestException(`Unknown permission key(s): ${invalid.join(", ")}`);
        }
    }

    /**
     * COMPANY_ADMIN creates a role scoped to their own tenant. SUPER_ADMIN
     * creates a global role, offered to every tenant alongside the
     * built-in ones — the platform-level "add a new role" path.
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

        const role = await this.prisma.role.create({
            data: {
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                isSystem: false,
                discountLimit: dto.discountLimit ?? null,
                companyId,
                permissions: {
                    create: permissions.map((p) => ({ permissionId: p.id })),
                },
            },
            include: { permissions: { select: { permission: { select: { key: true } } } } },
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.ROLE_CREATED,
            targetType: "Role",
            targetId: role.id,
            companyId: role.companyId ?? undefined,
            metadata: { name: role.name, permissionKeys: dto.permissionKeys },
        });

        return role;
    }

    async updateRole(actor: AuthUser, roleId: string, dto: UpdateRoleDto) {
        const role = await this.getVisibleRole(actor, roleId);
        this.assertCanManageRole(actor, role);

        const updated = await this.prisma.role.update({
            where: { id: roleId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
                ...(dto.discountLimit !== undefined ? { discountLimit: dto.discountLimit } : {}),
            },
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.ROLE_UPDATED,
            targetType: "Role",
            targetId: role.id,
            companyId: role.companyId ?? undefined,
            metadata: { name: updated.name, changes: {...dto} },
        });

        return updated;
    }

    async setRolePermissions(actor: AuthUser, roleId: string, permissionKeys: string[]) {
        this.assertPermissionKeysExist(permissionKeys);
        const role = await this.getVisibleRole(actor, roleId);
        this.assertCanManageRole(actor, role);

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

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.ROLE_PERMISSIONS_UPDATED,
            targetType: "Role",
            targetId: role.id,
            companyId: role.companyId ?? undefined,
            metadata: { name: role.name, permissionKeys },
        });

        return this.getVisibleRole(actor, roleId);
    }

    async deleteRole(actor: AuthUser, roleId: string) {
        const role = await this.getVisibleRole(actor, roleId);
        this.assertCanManageRole(actor, role);

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

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.ROLE_DELETED,
            targetType: "Role",
            targetId: role.id,
            companyId: role.companyId ?? undefined,
            metadata: { name: role.name },
        });
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
