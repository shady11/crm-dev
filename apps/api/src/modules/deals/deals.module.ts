import {Module} from '@nestjs/common';
import {PrismaModule} from '@/database/prisma.module';

import {DealsController} from './controllers/deals.controller';

import {DealsService} from './services/deals.service';
import {DealActivityService} from './services/deal-activity.service';
import {PaymentService} from './services/payments/payment.service';
import {PaymentScheduleService} from './services/payments/payment-schedule.service';
import {DealMapper} from "@/modules/deals/mappers/deal.mapper";
import {DealDomainService} from "@/modules/deals/services/deal-domain.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {DealExpiryService} from "@/modules/deals/services/deal-expiry.service";
import { DealNumberService } from '@/modules/deals/services/deal-number.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DealsController],
  providers: [
    DealsService,
    DealDomainService,
    DealActivityService,
    PaymentService,
    PaymentScheduleService,
    DealMapper,
    DealExpiryService,
    DealNumberService,
  ],
  exports: [DealsService, PaymentService, PaymentScheduleService],
})
export class DealsModule {}