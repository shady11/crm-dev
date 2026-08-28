import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {NotificationsController} from "./notifications.controller";
import {NotificationsService} from "./notifications.service";
import {NotificationsCronService} from "./notifications-cron.service";
import {AuthModule} from "@/modules/auth/auth.module";
import {NotificationsGateway} from "@/modules/notifications/notifications.gateway";
import {SessionValidationService} from "@/modules/auth/session-validation.service";

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsCronService, NotificationsGateway, SessionValidationService],
    exports: [NotificationsService],
})
export class NotificationsModule {}