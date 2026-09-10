import { Injectable } from '@nestjs/common';

import { OutboundChannel } from '@/generated/prisma/client';

import {
  MessageProvider,
  SendMessageParams,
  SendMessageResult,
} from './message-provider';

/**
 * Routes each channel to the first delegate that actually supports it,
 * falling back to the last delegate (expected to be LoggingMessageProvider,
 * which supports everything) for channels nothing real is wired up for yet.
 * This lets SMTP go live for EMAIL today without pretending SMS/WhatsApp
 * are delivering when no gateway has been chosen for them.
 */
@Injectable()
export class CompositeMessageProvider implements MessageProvider {
  constructor(private readonly delegates: MessageProvider[]) {}

  supports(channel: OutboundChannel): boolean {
    return this.delegates.some((delegate) => delegate.supports(channel));
  }

  send(params: SendMessageParams): Promise<SendMessageResult> {
    const delegate = this.delegates.find((d) => d.supports(params.channel));
    if (!delegate) {
      throw new Error(`No message provider supports channel ${params.channel}`);
    }
    return delegate.send(params);
  }
}
