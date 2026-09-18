import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { UnitsService } from "./units.service";
import { UnitsImportService } from "./units-import.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { QueryUnitsDto } from "./dto/query-units.dto";
import {UpdateUnitStatusDto} from "@/modules/units/dto/update-unit-status.dto";
import {CreateUnitsBulkDto} from "@/modules/units/dto/create-units-bulk.dto";
import {unitsImportMulterOptions} from "@/modules/units/units-import.constants";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class UnitsController {
    constructor(
        private readonly unitsService: UnitsService,
        private readonly unitsImportService: UnitsImportService,
    ) {}

    @RequirePermissions("inventory.view")
    @Get("units")
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryUnitsDto) {
        return this.unitsService.findAll(user, query);
    }

    @RequirePermissions("inventory.view")
    @Get("floors/:floorId/units")
    findByFloor(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Query() query: QueryUnitsDto,
    ) {
        return this.unitsService.findByFloor(user, floorId, query);
    }

    @RequirePermissions("inventory.view")
    @Get("units/:id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.findOne(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Post("floors/:floorId/units")
    create(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Body() dto: CreateUnitDto,
    ) {
        return this.unitsService.create(user, floorId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Post("floors/:floorId/units/bulk")
    createBulk(
        @CurrentUser() user: AuthUser,
        @Param("floorId") floorId: string,
        @Body() dto: CreateUnitsBulkDto,
    ) {
        return this.unitsService.createBulk(user, floorId, dto);
    }

    // The one deviation from the rest of the inventory hierarchy: a
    // SALES_HEAD may correct a unit's own details and status via
    // units.edit, but create/import/duplicate/delete stay inventory.manage
    // (COMPANY_ADMIN only) — see inventory-role-matrix.spec.ts.
    @RequirePermissions("units.edit")
    @Patch("units/:id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUnitDto,
    ) {
        return this.unitsService.update(user, id, dto);
    }

    @RequirePermissions("units.edit")
    @Patch("units/:id/status")
    updateStatus(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUnitStatusDto,
    ) {
        return this.unitsService.updateStatus(user, id, dto.status);
    }

    // CA-C1: bulk-create a project's units from an uploaded CSV/XLSX, resolving
    // (and auto-creating) the block/entrance/floor hierarchy per row.
    @RequirePermissions("inventory.manage")
    @Post("projects/:projectId/units/import")
    @UseInterceptors(FileInterceptor("file", unitsImportMulterOptions))
    importUnits(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.unitsImportService.importFromFile(user, projectId, file);
    }

    @RequirePermissions("inventory.manage")
    @Post("units/:id/duplicate")
    duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.duplicate(user, id);
    }

    @RequirePermissions("inventory.manage")
    @Delete("units/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.unitsService.remove(user, id);
    }
}
