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
import { EntrancesService } from "./entrances.service";
import { CreateEntranceDto } from "./dto/create-entrance.dto";
import { UpdateEntranceDto } from "./dto/update-entrance.dto";
import { QueryEntrancesDto } from "./dto/query-entrances.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class EntrancesController {
    constructor(private readonly entrancesService: EntrancesService) {}

    @RequirePermissions("inventory.view")
    @Get("blocks/:blockId/entrances")
    findByBlock(
        @CurrentUser() user: AuthUser,
        @Param("blockId") blockId: string,
        @Query() query: QueryEntrancesDto,
    ) {
        return this.entrancesService.findByBlock(user, blockId, query);
    }

    @RequirePermissions("inventory.view")
    @Get("entrances/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.entrancesService.findOne(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Post("blocks/:blockId/entrances")
    create(
        @CurrentUser() user: AuthUser,
        @Param("blockId") blockId: string,
        @Body() dto: CreateEntranceDto,
    ) {
        return this.entrancesService.create(user, blockId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Patch("entrances/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateEntranceDto,
    ) {
        return this.entrancesService.update(user, id, dto);
    }

    @RequirePermissions("inventory.manage")
    @Post("entrances/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.entrancesService.duplicate(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Delete("entrances/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.entrancesService.remove(user, id);
    }
}
