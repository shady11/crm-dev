import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {SettingOptionsService} from "./setting-options.service";
import {CreateSettingOptionDto} from "./dto/create-setting-option.dto";
import {UpdateSettingOptionDto} from "./dto/update-setting-option.dto";
import {QuerySettingOptionsDto} from "./dto/query-setting-options.dto";

/**
 * The currency/locale/timezone options tenants can be assigned.
 *
 * Reading the list is open to any authenticated user — both the SUPER_ADMIN's
 * company management sheet and a COMPANY_ADMIN's own settings page need it to
 * populate their dropdowns. Only a SUPER_ADMIN can create, edit, or delete an
 * option, matching who administers tenants at all (see CompaniesController).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("setting-options")
export class SettingOptionsController {
    constructor(private readonly settingOptionsService: SettingOptionsService) {}

    @Get()
    findAll(@CurrentUser() actor: AuthUser, @Query() query: QuerySettingOptionsDto) {
        // Inactive options are for the SUPER_ADMIN's management screen only —
        // anyone else's dropdown only ever needs what's still offered.
        return this.settingOptionsService.findAll({
            ...query,
            includeInactive: query.includeInactive && actor.role === UserRole.SUPER_ADMIN,
        });
    }

    @Roles(UserRole.SUPER_ADMIN)
    @Post()
    create(@Body() dto: CreateSettingOptionDto) {
        return this.settingOptionsService.create(dto);
    }

    @Roles(UserRole.SUPER_ADMIN)
    @Patch(":id")
    update(@Param("id") id: string, @Body() dto: UpdateSettingOptionDto) {
        return this.settingOptionsService.update(id, dto);
    }

    @Roles(UserRole.SUPER_ADMIN)
    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.settingOptionsService.remove(id);
    }
}
