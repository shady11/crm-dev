import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {TasksController} from "./tasks.controller";
import {TasksService} from "./tasks.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";

@Module({
    imports: [
        PrismaModule,
        NotificationsModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}