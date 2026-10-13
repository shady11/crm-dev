import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module';
import { RbacModule } from '@/modules/rbac/rbac.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [ClientsModule, RbacModule, TasksModule, NotificationsModule],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
