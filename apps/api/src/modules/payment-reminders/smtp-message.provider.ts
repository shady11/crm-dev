import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { OutboundChannel } from '@/generated/prisma/client';

import {
  MessageProvider,
  SendMessageParams,
  SendMessageResult,
} from './message-provider';

export interface SmtpProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

/**
 * The one real outbound channel wired into this deployment: transactional
 * email over SMTP. SMS/WhatsApp still have no gateway chosen (Twilio,
 * WhatsApp Business Platform approval, cost — a business decision), so they
 * stay on LoggingMessageProvider via CompositeMessageProvider. This is
 * enough for a pilot to prove reminders actually reach clients, not a
 * final channel mix.
 */
@Injectable()
export class SmtpMessageProvider implements MessageProvider {
  private readonly logger = new Logger(SmtpMessageProvider.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpProviderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
    });
  }

  supports(channel: OutboundChannel): boolean {
    return channel === OutboundChannel.EMAIL;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (params.channel !== OutboundChannel.EMAIL) {
      throw new Error(
        `SmtpMessageProvider cannot send on channel ${params.channel}`,
      );
    }
    if (!params.to) {
      throw new Error('Cannot send email reminder: recipient has no email');
    }

    // nodemailer's Transporter is generic over transport-specific info and
    // types sendMail's result as `any` as a result — messageId is documented
    // to always be present regardless of transport.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const info: { messageId: string } = await this.transporter.sendMail({
      from: this.config.from,
      to: params.to,
      subject: 'Payment reminder',
      html: params.body,
    });

    this.logger.log(`Sent email to ${params.to} (messageId=${info.messageId})`);
    return { providerMessageId: info.messageId };
  }
}
