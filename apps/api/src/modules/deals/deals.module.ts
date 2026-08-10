import {Module} from '@nestjs/common';
import {PrismaModule} from '@/database/prisma.module';

import {DealsController} from './controllers/deals.controller';

import {DealsService} from './services/deals.service';
import {DealActivityService} from './services/deal-activity.service';
import {PaymentService} from './services/payment.service';
import {PaymentScheduleService} from './services/payment-schedule.service';
import {DealMapper} from "@/modules/deals/mappers/deal.mapper";
import {DealDomainService} from "@/modules/deals/services/deal-domain.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";

@Module({
  imports: [
      PrismaModule,
      NotificationsModule,
  ],
  controllers: [DealsController],
  providers: [
    DealsService,
    DealDomainService,
    DealActivityService,
    PaymentService,
    PaymentScheduleService,
    DealMapper,
  ],
  exports: [
    DealsService,
    PaymentService,
    PaymentScheduleService,
  ],
})
export class DealsModule {}