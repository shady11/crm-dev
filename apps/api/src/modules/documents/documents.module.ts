import {Module} from "@nestjs/common";
import {PrismaModule} from "@/database/prisma.module";
import {DocumentsController} from "./documents.controller";
import {DocumentsService} from "./documents.service";
import {DocumentsCleanupService} from "./documents-cleanup.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {FileStorageModule} from "./storage/file-storage.module";

@Module({
    imports: [
        PrismaModule,
        NotificationsModule,
        FileStorageModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService, DocumentsCleanupService],
    exports: [DocumentsService],
})
export class DocumentsModule {}