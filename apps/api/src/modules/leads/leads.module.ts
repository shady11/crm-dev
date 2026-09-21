import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module';
import { RbacModule } from '@/modules/rbac/rbac.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [ClientsModule, RbacModule, TasksModule],
  providers: [LeadsService],
  controllers: [LeadsController]
})
export class LeadsModule {}
