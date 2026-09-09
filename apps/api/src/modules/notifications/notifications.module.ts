import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {NotificationsController} from "./notifications.controller";
import {NotificationsService} from "./notifications.service";
import {NotificationsCronService} from "./notifications-cron.service";
import {AuthModule} from "@/modules/auth/auth.module";
import {NotificationsGateway} from "@/modules/notifications/notifications.gateway";
import {WebsocketModule} from "@/common/websocket/websocket.module";

@Module({
    imports: [PrismaModule, AuthModule, WebsocketModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsCronService, NotificationsGateway],
    exports: [NotificationsService],
})
export class NotificationsModule {}