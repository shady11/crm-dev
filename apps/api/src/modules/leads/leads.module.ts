import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module';
import { RbacModule } from '@/modules/rbac/rbac.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [ClientsModule, RbacModule],
  providers: [LeadsService],
  controllers: [LeadsController]
})
export class LeadsModule {}
