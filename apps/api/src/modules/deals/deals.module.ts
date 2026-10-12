import {Module} from '@nestjs/common';
import {PrismaModule} from '@/database/prisma.module';

import {DealsController} from './controllers/deals.controller';
import {PaymentsController} from './controllers/payments.controller';

import {DealsService} from './services/deals.service';
import {DealActivityService} from './services/deal-activity.service';
import {PaymentService} from './services/payments/payment.service';
import {PaymentScheduleService} from './services/payments/payment-schedule.service';
import {PaymentRegisterService} from './services/payments/payment-register.service';
import {MoneyHeldNotifier} from './services/money-held-notifier.service';
import {ReceiptNumberService} from './services/payments/receipt-number.service';
import {PaymentReceiptService} from './services/payments/payment-receipt.service';
import {DealMapper} from "@/modules/deals/mappers/deal.mapper";
import {DealDomainService} from "@/modules/deals/services/deal-domain.service";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {DealExpiryService} from "@/modules/deals/services/deal-expiry.service";
import {DiscountApprovalReminderService} from "@/modules/deals/services/discount-approval-reminder.service";
import { DealNumberService } from '@/modules/deals/services/deal-number.service';
import {DocumentGenerationModule} from "@/modules/document-generation/document-generation.module";
import {RbacModule} from "@/modules/rbac/rbac.module";
import {TasksModule} from "@/modules/tasks/tasks.module";

@Module({
  imports: [PrismaModule, NotificationsModule, DocumentGenerationModule, RbacModule, TasksModule],
  controllers: [DealsController, PaymentsController],
  providers: [
    DealsService,
    DealDomainService,
    DealActivityService,
    PaymentService,
    PaymentScheduleService,
    PaymentRegisterService,
    MoneyHeldNotifier,
    ReceiptNumberService,
    PaymentReceiptService,
    DealMapper,
    DealExpiryService,
    DiscountApprovalReminderService,
    DealNumberService,
  ],
  exports: [DealsService, PaymentService, PaymentScheduleService],
})
export class DealsModule {}