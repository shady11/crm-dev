import { Injectable, Logger } from '@nestjs/common';
import { OutboundChannel } from '@/generated/prisma/client';

export interface SendMessageParams {
  channel: OutboundChannel;
  to: string;
  body: string;
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
  send(params: SendMessageParams): Promise<SendMessageResult>;
}

/**
 * Placeholder implementation: logs instead of actually reaching a client.
 * No SMS/WhatsApp provider is wired into this deployment yet (that's a
 * business decision — provider selection, cost, WhatsApp Business Platform
 * approval — not an engineering one, per the spec's rollout). Swapping this
 * for a real provider is the entire scope of Phase 2/3; everything else
 * (rendering, dedup, delivery logging) is already provider-agnostic.
 */
@Injectable()
export class LoggingMessageProvider implements MessageProvider {
  private readonly logger = new Logger(LoggingMessageProvider.name);

  send(params: SendMessageParams): Promise<SendMessageResult> {
    this.logger.log(
      `[${params.channel}] would send to ${params.to}: ${params.body}`,
    );
    return Promise.resolve({ providerMessageId: undefined });
  }
}
