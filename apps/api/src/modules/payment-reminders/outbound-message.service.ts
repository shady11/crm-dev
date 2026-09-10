import { Inject, Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

import { PrismaService } from '@/database/prisma.service';
import {
  OutboundChannel,
  OutboundMessageStatus,
  Prisma,
} from '@/generated/prisma/client';

import { REMINDER_TEMPLATES } from './reminder-templates';
import { buildReminderContext } from './reminder-context.builder';
import { MESSAGE_PROVIDER, MessageProvider } from './message-provider';

interface ReminderClient {
  id: string;
  fullName: string;
  whatsapp: string | null;
  phone: string;
  email: string | null;
}

interface SendReminderParams {
  companyId: string;
  companyName: string;
  client: ReminderClient;
  dealNumber: string;
  scheduleId: string;
  scheduleAmount: Prisma.Decimal | number;
  scheduleDueDate: Date;
  templateKey: string;
}

/**
 * WhatsApp preferred, SMS next (Client.phone is required so this is always
 * reachable), email last. Matches the channel priority from the spec —
 * kept as a real fallback chain even though Client.phone being required
 * today makes the email branch effectively unreachable, in case that
 * constraint ever loosens.
 */
function pickChannel(client: ReminderClient): {
  channel: OutboundChannel;
  to: string;
} {
  if (client.whatsapp)
    return { channel: OutboundChannel.WHATSAPP, to: client.whatsapp };
  if (client.phone) return { channel: OutboundChannel.SMS, to: client.phone };
  return { channel: OutboundChannel.EMAIL, to: client.email ?? '' };
}

@Injectable()
export class OutboundMessageService {
  private readonly logger = new Logger(OutboundMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_PROVIDER) private readonly provider: MessageProvider,
  ) {}

  async sendReminder(params: SendReminderParams) {
    const template = REMINDER_TEMPLATES[params.templateKey];
    if (!template) {
      throw new Error(
        `No reminder template registered for key "${params.templateKey}"`,
      );
    }

    const context = buildReminderContext({
      clientFullName: params.client.fullName,
      dealNumber: params.dealNumber,
      scheduleAmount: params.scheduleAmount,
      scheduleDueDate: params.scheduleDueDate,
      companyName: params.companyName,
    });

    const body = Handlebars.compile(template, { strict: true })(context);
    const { channel, to } = pickChannel(params.client);

    try {
      const result = await this.provider.send({ channel, to, body });

      return this.prisma.outboundMessage.create({
        data: {
          companyId: params.companyId,
          channel,
          recipientClientId: params.client.id,
          paymentScheduleId: params.scheduleId,
          templateKey: params.templateKey,
          body,
          status: OutboundMessageStatus.SENT,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send ${params.templateKey} to client ${params.client.id}: ${failureReason}`,
      );

      return this.prisma.outboundMessage.create({
        data: {
          companyId: params.companyId,
          channel,
          recipientClientId: params.client.id,
          paymentScheduleId: params.scheduleId,
          templateKey: params.templateKey,
          body,
          status: OutboundMessageStatus.FAILED,
          failureReason,
        },
      });
    }
  }

  /**
   * Dedup for the daily cron: has this exact stage already fired for this
   * schedule today? Mirrors NotificationsCronService.notifyOnce's
   * lookback-query convention rather than a separate flag column.
   */
  async alreadySentToday(
    scheduleId: string,
    templateKey: string,
  ): Promise<boolean> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existing = await this.prisma.outboundMessage.findFirst({
      where: {
        paymentScheduleId: scheduleId,
        templateKey,
        createdAt: { gte: startOfToday },
      },
    });

    return existing !== null;
  }
}
