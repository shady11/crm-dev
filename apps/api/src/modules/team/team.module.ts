import {Module} from "@nestjs/common";
import {LeadsModule} from "@/modules/leads/leads.module";
import {DealsModule} from "@/modules/deals/deals.module";
import {TasksModule} from "@/modules/tasks/tasks.module";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {HandoverService} from "./handover.service";
import {TeamController} from "./team.controller";

@Module({
    imports: [LeadsModule, DealsModule, TasksModule, NotificationsModule],
    providers: [HandoverService],
    controllers: [TeamController],
})
export class TeamModule {}
