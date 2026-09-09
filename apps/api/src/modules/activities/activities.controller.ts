import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {BranchGuard} from "@/common/guards/branch.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {ActivitiesService} from "./activities.service";
import {QueryActivitiesDto} from "./dto/query-activities.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, RolesGuard)
@Controller("activities")
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}

    // COMPANY_ADMIN sees every activity in the company; SALES_HEAD and
    // SALES_MANAGER (branch-scoped roles) see only their own branch's —
    // enforced in ActivitiesService.findAll via isBranchScopedRole.
    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER)
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryActivitiesDto) {
        return this.activitiesService.findAll(user, query);
    }
}
