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
import { UserRole } from "@/generated/prisma/enums";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { BlocksService } from "./blocks.service";
import { CreateBlockDto } from "./dto/create-block.dto";
import { UpdateBlockDto } from "./dto/update-block.dto";
import { QueryBlocksDto } from "./dto/query-blocks.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller()
export class BlocksController {
    constructor(private readonly blocksService: BlocksService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("projects/:projectId/blocks")
    findByProject(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @Query() query: QueryBlocksDto,
    ) {
        return this.blocksService.findByProject(user, projectId, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("blocks/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.blocksService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("projects/:projectId/blocks")
    create(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @Body() dto: CreateBlockDto,
    ) {
        return this.blocksService.create(user, projectId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch("blocks/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateBlockDto,
    ) {
        return this.blocksService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete("blocks/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.blocksService.remove(user, id);
    }
}