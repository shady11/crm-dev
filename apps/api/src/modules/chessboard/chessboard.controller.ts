import {
    Controller,
    Get,
    Param,
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
import { ChessboardService } from "./chessboard.service";
import { QueryChessboardDto } from "./dto/query-chessboard.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller()
export class ChessboardController {
    constructor(private readonly chessboardService: ChessboardService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get("projects/:projectId/chessboard")
    getProjectChessboard(
        @CurrentUser() user: AuthUser,
        @Param("projectId") projectId: string,
        @Query() query: QueryChessboardDto,
    ) {
        return this.chessboardService.getProjectChessboard(
            user,
            projectId,
            query,
        );
    }
}