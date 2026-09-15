import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/types/auth-user.type";
import { ChessboardService } from "./chessboard.service";
import { QueryChessboardDto } from "./dto/query-chessboard.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class ChessboardController {
    constructor(private readonly chessboardService: ChessboardService) {}

    @RequirePermissions("chessboard.view")
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
