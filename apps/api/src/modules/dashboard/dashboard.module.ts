import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {RbacModule} from "@/modules/rbac/rbac.module";
import {DashboardController} from "./dashboard.controller";
import {DashboardService} from "./dashboard.service";

@Module({
    imports: [PrismaModule, RbacModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}