import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

import { PaymentReminderCronService } from './payment-reminder-cron.service';
import { OutboundMessageService } from './outbound-message.service';
import {
  LoggingMessageProvider,
  MessageProvider,
  MESSAGE_PROVIDER,
} from './message-provider';
import { SmtpMessageProvider } from './smtp-message.provider';
import { WhatsAppMessageProvider } from './whatsapp-message.provider';
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
        // Real channels stack on top of the logging fallback; each is only
        // added once its own credentials are configured, so an unconfigured
        // channel keeps logging instead of the whole app failing to boot.
        const delegates: MessageProvider[] = [];

        if (process.env.SMTP_HOST) {
          delegates.push(
            new SmtpMessageProvider({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT ?? 587),
              secure: process.env.SMTP_SECURE === 'true',
              user: process.env.SMTP_USER,
              password: process.env.SMTP_PASSWORD,
              from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
            }),
          );
        }

        if (
          process.env.WHATSAPP_ACCESS_TOKEN &&
          process.env.WHATSAPP_PHONE_NUMBER_ID
        ) {
          delegates.push(
            new WhatsAppMessageProvider({
              accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
              phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
              apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
            }),
          );
        }

        delegates.push(logging);

        // SMS still has no gateway chosen, so it always falls through to
        // `logging` regardless of what else is configured.
        return new CompositeMessageProvider(delegates);
      },
      inject: [LoggingMessageProvider],
    },
  ],
  exports: [OutboundMessageService],
})
export class PaymentRemindersModule {}
