import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {DocumentsController} from "./documents.controller";
import {DocumentsService} from "./documents.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";

@Module({
    imports: [
        PrismaModule,
        NotificationsModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}