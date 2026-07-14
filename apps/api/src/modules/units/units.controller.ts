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
import { UnitStatus, UserRole } from "@/generated/prisma/enums";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { UnitsService } from "./units.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { QueryUnitsDto } from "./dto/query-units.dto";
import {UpdateUnitStatusDto} from "@/modules/units/dto/update-unit-status.dto";
import {CreateUnitsBulkDto} from "@/modules/units/dto/create-units-bulk.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller()
export class UnitsController {
    constructor(private readonly unitsService: UnitsService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("units")
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryUnitsDto) {
        return this.unitsService.findAll(user, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("floors/:floorId/units")
    findByFloor(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Query() query: QueryUnitsDto,
    ) {
        return this.unitsService.findByFloor(user, floorId, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("units/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("floors/:floorId/units")
    create(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Body() dto: CreateUnitDto,
    ) {
        return this.unitsService.create(user, floorId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("floors/:floorId/units/bulk")
    createBulk(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Body() dto: CreateUnitsBulkDto,
    ) {
        return this.unitsService.createBulk(user, floorId, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Patch("units/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUnitDto,
    ) {
        return this.unitsService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Patch("units/:id/status")
    updateStatus(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUnitStatusDto,
    ) {
        return this.unitsService.updateStatus(user, id, dto.status);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post("units/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.duplicate(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete("units/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.remove(user, id);
    }
}