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
import { BlocksService } from "./blocks.service";
import { CreateBlockDto } from "./dto/create-block.dto";
import { UpdateBlockDto } from "./dto/update-block.dto";
import { QueryBlocksDto } from "./dto/query-blocks.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class BlocksController {
    constructor(private readonly blocksService: BlocksService) {}

    @RequirePermissions("inventory.view")
    @Get("projects/:projectId/blocks")
    findByProject(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @Query() query: QueryBlocksDto,
    ) {
        return this.blocksService.findByProject(user, projectId, query);
    }

    @RequirePermissions("inventory.view")
    @Get("blocks/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.blocksService.findOne(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Post("projects/:projectId/blocks")
    create(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @Body() dto: CreateBlockDto,
    ) {
        return this.blocksService.create(user, projectId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Patch("blocks/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateBlockDto,
    ) {
        return this.blocksService.update(user, id, dto);
    }

    @RequirePermissions("inventory.manage")
    @Post("blocks/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.blocksService.duplicate(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Delete("blocks/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.blocksService.remove(user, id);
    }
}
