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
import { EntrancesService } from "./entrances.service";
import { CreateEntranceDto } from "./dto/create-entrance.dto";
import { UpdateEntranceDto } from "./dto/update-entrance.dto";
import { QueryEntrancesDto } from "./dto/query-entrances.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller()
export class EntrancesController {
    constructor(private readonly entrancesService: EntrancesService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("blocks/:blockId/entrances")
    findByBlock(
        @CurrentUser() user: AuthUser,
        @Param("blockId") blockId: string,
        @Query() query: QueryEntrancesDto,
    ) {
        return this.entrancesService.findByBlock(user, blockId, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("entrances/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.entrancesService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("blocks/:blockId/entrances")
    create(
        @CurrentUser() user: AuthUser,
        @Param("blockId") blockId: string,
        @Body() dto: CreateEntranceDto,
    ) {
        return this.entrancesService.create(user, blockId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch("entrances/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateEntranceDto,
    ) {
        return this.entrancesService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete("entrances/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.entrancesService.remove(user, id);
    }
}