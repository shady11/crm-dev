import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

import { PaymentReminderCronService } from './payment-reminder-cron.service';
import { OutboundMessageService } from './outbound-message.service';
import { LoggingMessageProvider, MESSAGE_PROVIDER } from './message-provider';
import { SmtpMessageProvider } from './smtp-message.provider';
import { CompositeMessageProvider } from './composite-message.provider';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [
    PaymentReminderCronService,
    OutboundMessageService,
    LoggingMessageProvider,
    {
      provide: MESSAGE_PROVIDER,
      useFactory: (logging: LoggingMessageProvider) => {
        if (!process.env.SMTP_HOST) {
          // No SMTP configured — everything logs, same as before.
          return logging;
        }
        const smtp = new SmtpMessageProvider({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER,
          password: process.env.SMTP_PASSWORD,
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
        });
        // SMTP really sends EMAIL; SMS/WhatsApp still fall back to logging
        // until a gateway for those channels is chosen.
        return new CompositeMessageProvider([smtp, logging]);
      },
      inject: [LoggingMessageProvider],
    },
  ],
  exports: [OutboundMessageService],
})
export class PaymentRemindersModule {}
