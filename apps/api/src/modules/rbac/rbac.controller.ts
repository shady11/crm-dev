import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { RbacService } from "./rbac.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { SetRolePermissionsDto } from "./dto/set-role-permissions.dto";

/**
 * Role & permission administration. Every endpoint requires rbac.manage,
 * held by COMPANY_ADMIN (for their own tenant) and implicitly by
 * SUPER_ADMIN (platform-wide, via PermissionsGuard's bypass — see
 * RbacService for how each method further scopes a SUPER_ADMIN vs.
 * COMPANY_ADMIN actor to system/global vs. tenant-owned roles).
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("rbac.manage")
@Controller("rbac")
export class RbacController {
    constructor(private readonly rbacService: RbacService) {}

    @Get("permissions")
    listPermissions() {
        return this.rbacService.listPermissions();
    }

    @Get("roles")
    listRoles(@CurrentUser() actor: AuthUser) {
        return this.rbacService.listRoles(actor);
    }

    @Post("roles")
    createRole(@CurrentUser() actor: AuthUser, @Body() dto: CreateRoleDto) {
        return this.rbacService.createRole(actor, dto);
    }

    @Patch("roles/:id")
    updateRole(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.rbacService.updateRole(actor, id, dto);
    }

    @Put("roles/:id/permissions")
    setRolePermissions(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Body() dto: SetRolePermissionsDto,
    ) {
        return this.rbacService.setRolePermissions(actor, id, dto.permissionKeys);
    }

    @Delete("roles/:id")
    deleteRole(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
        return this.rbacService.deleteRole(actor, id);
    }

    // Read-only: every user has exactly one Role, so "who has this role"
    // is reassigned via UsersController's edit-user flow (roleId is just
    // another field there), not by checking boxes in this panel.
    @Get("roles/:id/members")
    listRoleMembers(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
        return this.rbacService.listRoleMembers(actor, id);
    }
}
