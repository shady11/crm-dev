import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

import { PaymentReminderCronService } from './payment-reminder-cron.service';
import { OutboundMessageService } from './outbound-message.service';
import { LoggingMessageProvider, MESSAGE_PROVIDER } from './message-provider';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [
    PaymentReminderCronService,
    OutboundMessageService,
    { provide: MESSAGE_PROVIDER, useClass: LoggingMessageProvider },
  ],
  exports: [OutboundMessageService],
})
export class PaymentRemindersModule {}
