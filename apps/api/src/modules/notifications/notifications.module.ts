import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {NotificationsController} from "./notifications.controller";
import {NotificationsService} from "./notifications.service";
import {NotificationsCronService} from "./notifications-cron.service";

@Module({
    imports: [PrismaModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsCronService],
    exports: [NotificationsService],
})
export class NotificationsModule {}