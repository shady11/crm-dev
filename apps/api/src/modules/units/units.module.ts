import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsImportService } from './units-import.service';
import { UnitsController } from './units.controller';
import { UnitPriceRequestsService } from './unit-price-requests.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { RbacModule } from '@/modules/rbac/rbac.module';

@Module({
  imports: [NotificationsModule, RbacModule],
  providers: [UnitsService, UnitsImportService, UnitPriceRequestsService],
  controllers: [UnitsController]
})
export class UnitsModule {}
