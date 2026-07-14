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
import { FloorsService } from "./floors.service";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { QueryFloorsDto } from "./dto/query-floors.dto";
import {CreateFloorsBulkDto} from "@/modules/floors/dto/create-floors-bulk.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller()
export class FloorsController {
    constructor(private readonly floorsService: FloorsService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("entrances/:entranceId/floors")
    findByEntrance(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Query() query: QueryFloorsDto,
    ) {
        return this.floorsService.findByEntrance(user, entranceId, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("floors/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("entrances/:entranceId/floors")
    create(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Body() dto: CreateFloorDto,
    ) {
        return this.floorsService.create(user, entranceId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("entrances/:entranceId/floors/bulk")
    createBulk(
        @CurrentUser() user: AuthUser,
        @Param("entranceId") entranceId: string,
        @Body() dto: CreateFloorsBulkDto,
    ) {
        return this.floorsService.createBulk(user, entranceId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch("floors/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateFloorDto,
    ) {
        return this.floorsService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("floors/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.duplicate(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete("floors/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.floorsService.remove(user, id);
    }
}