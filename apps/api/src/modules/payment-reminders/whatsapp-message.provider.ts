import { Injectable, Logger } from '@nestjs/common';
import { OutboundChannel } from '@/generated/prisma/client';

import {
  MessageProvider,
  SendMessageParams,
  SendMessageResult,
} from './message-provider';
import { WHATSAPP_TEMPLATE_MAP } from './whatsapp-template-map';

export interface WhatsAppProviderConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

interface GraphApiErrorBody {
  error?: { message?: string };
}

interface GraphApiSuccessBody {
  messages?: { id: string }[];
}

/**
 * Builds the exact request body Meta's Graph API expects for a template
 * message — split out from send() so the payload shape can be unit-tested
 * without a network call.
 */
export function buildWhatsAppTemplateRequest(
  to: string,
  templateKey: string,
  context: Parameters<
    (typeof WHATSAPP_TEMPLATE_MAP)[string]['buildParameters']
  >[0],
) {
  const template = WHATSAPP_TEMPLATE_MAP[templateKey];
  if (!template) {
    throw new Error(
      `No WhatsApp template mapped for reminder "${templateKey}". ` +
        'Add an entry to WHATSAPP_TEMPLATE_MAP once the template is approved in Meta Business Manager.',
    );
  }

  return {
    messaging_product: 'whatsapp' as const,
    // Meta expects digits only (country code + number), no leading "+".
    to: to.replace(/[^\d]/g, ''),
    type: 'template' as const,
    template: {
      name: template.name,
      language: { code: template.languageCode },
      components: [
        {
          type: 'body',
          parameters: template.buildParameters(context).map((text) => ({
            type: 'text',
            text,
          })),
        },
      ],
    },
  };
}

/**
 * WhatsApp Business Platform via Meta's Cloud API. Business-initiated
 * messages (payment reminders are always business-initiated — the client
 * didn't message first) must use a pre-approved template; see
 * whatsapp-template-map.ts for what has to exist in Meta Business Manager
 * before a given reminder stage can actually send.
 */
@Injectable()
export class WhatsAppMessageProvider implements MessageProvider {
  private readonly logger = new Logger(WhatsAppMessageProvider.name);

  constructor(private readonly config: WhatsAppProviderConfig) {}

  supports(channel: OutboundChannel): boolean {
    return channel === OutboundChannel.WHATSAPP;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (params.channel !== OutboundChannel.WHATSAPP) {
      throw new Error(
        `WhatsAppMessageProvider cannot send on channel ${params.channel}`,
      );
    }
    if (!params.templateKey || !params.context) {
      throw new Error(
        'WhatsApp requires templateKey/context — free-text sends are not supported by the Business Platform',
      );
    }

    const body = buildWhatsAppTemplateRequest(
      params.to,
      params.templateKey,
      params.context,
    );

    const response = await fetch(
      `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const json: unknown = await response.json();

    if (!response.ok) {
      const message =
        (json as GraphApiErrorBody).error?.message ??
        `WhatsApp API request failed with status ${response.status}`;
      throw new Error(message);
    }

    const messageId = (json as GraphApiSuccessBody).messages?.[0]?.id;
    this.logger.log(
      `Sent WhatsApp template ${params.templateKey} to ${params.to} (messageId=${messageId})`,
    );
    return { providerMessageId: messageId };
  }
}
