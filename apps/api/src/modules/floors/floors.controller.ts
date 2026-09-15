import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { FloorsService } from "./floors.service";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { QueryFloorsDto } from "./dto/query-floors.dto";
import {CreateFloorsBulkDto} from "@/modules/floors/dto/create-floors-bulk.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class FloorsController {
    constructor(private readonly floorsService: FloorsService) {}

    @RequirePermissions("inventory.view")
    @Get("entrances/:entranceId/floors")
    findByEntrance(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Query() query: QueryFloorsDto,
    ) {
        return this.floorsService.findByEntrance(user, entranceId, query);
    }

    @RequirePermissions("inventory.view")
    @Get("floors/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.findOne(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Post("entrances/:entranceId/floors")
    create(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Body() dto: CreateFloorDto,
    ) {
        return this.floorsService.create(user, entranceId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Post("entrances/:entranceId/floors/bulk")
    createBulk(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Body() dto: CreateFloorsBulkDto,
    ) {
        return this.floorsService.createBulk(user, entranceId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Patch("floors/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateFloorDto,
    ) {
        return this.floorsService.update(user, id, dto);
    }

    @RequirePermissions("inventory.manage")
    @Post("floors/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.duplicate(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Delete("floors/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.remove(user, id);
    }
}
