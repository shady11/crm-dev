import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {BranchGuard} from "@/common/guards/branch.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {ActivitiesService} from "./activities.service";
import {QueryActivitiesDto} from "./dto/query-activities.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@Controller("activities")
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}

    // COMPANY_ADMIN sees every activity in the company; SALES_HEAD and
    // SALES_MANAGER (branch-scoped roles) see only their own branch's —
    // enforced in ActivitiesService.findAll via user.isBranchScoped.
    // activities.view is not in FINANCE's default bundle.
    @RequirePermissions("activities.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryActivitiesDto) {
        return this.activitiesService.findAll(user, query);
    }
}
