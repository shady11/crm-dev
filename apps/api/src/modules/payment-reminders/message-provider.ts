import { Injectable, Logger } from '@nestjs/common';
import { OutboundChannel } from '@/generated/prisma/client';
import { ReminderContext } from './reminder-context.builder';

export interface SendMessageParams {
  channel: OutboundChannel;
  to: string;
  /** Pre-rendered text — what SMTP/SMS/logging actually send. */
  body: string;
  /**
   * Which reminder this is and the structured values behind it. Optional
   * because only WhatsApp needs it: business-initiated WhatsApp messages
   * must use a pre-approved template with positional parameters, not
   * arbitrary free text, so WhatsAppMessageProvider ignores `body` and
   * builds the template call from these instead.
   */
  templateKey?: string;
  context?: ReminderContext;
}

export interface SendMessageResult {
  providerMessageId?: string;
}

/**
 * Injection token for MessageProvider, so a real SMS/WhatsApp integration
 * (Twilio, per the spec) can be swapped in later without touching
 * OutboundMessageService or the cron that calls it — only the provider in
 * payment-reminders.module.ts changes.
 */
export const MESSAGE_PROVIDER = Symbol('MESSAGE_PROVIDER');

export interface MessageProvider {
  /** Whether this provider can actually deliver on the given channel. */
  supports(channel: OutboundChannel): boolean;
  send(params: SendMessageParams): Promise<SendMessageResult>;
}

/**
 * Placeholder implementation: logs instead of actually reaching a client.
 * Used for channels with no real gateway wired yet (SMS/WhatsApp — that's a
 * business decision — provider selection, cost, WhatsApp Business Platform
 * approval — not an engineering one), and as the only provider when no
 * outbound driver is configured at all (local dev, tests).
 */
@Injectable()
export class LoggingMessageProvider implements MessageProvider {
  private readonly logger = new Logger(LoggingMessageProvider.name);

  supports(): boolean {
    return true;
  }

  send(params: SendMessageParams): Promise<SendMessageResult> {
    this.logger.log(
      `[${params.channel}] would send to ${params.to}: ${params.body}`,
    );
    return Promise.resolve({ providerMessageId: undefined });
  }
}
