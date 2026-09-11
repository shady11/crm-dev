import { ReminderContext } from './reminder-context.builder';

export interface WhatsAppTemplateSpec {
  /** Must match the template's exact name as approved in Meta Business Manager. */
  name: string;
  /** e.g. "en_US" — must match the approved template's language exactly. */
  languageCode: string;
  /** Positional {{1}}, {{2}}, ... body parameters, in template order. */
  buildParameters(context: ReminderContext): string[];
}

/**
 * One Meta-approved WhatsApp template per reminder stage, mirroring the
 * wording (and parameter order) of REMINDER_TEMPLATES in
 * reminder-templates.ts. WhatsApp Business Platform requires every
 * business-initiated message to use a template Meta has reviewed — there is
 * no free-text equivalent of REMINDER_TEMPLATES' Handlebars strings here.
 *
 * To add a stage: submit a template with this exact name in Meta Business
 * Manager (Business Settings → WhatsApp Manager → Message Templates),
 * category "Utility", with the same number of {{n}} body variables as
 * buildParameters() returns below, then add the entry here. Approval
 * typically takes minutes to a few hours.
 */
export const WHATSAPP_TEMPLATE_MAP: Record<string, WhatsAppTemplateSpec> = {
  payment_due_soon: {
    name: 'payment_due_soon',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    // Body: "Hi {{1}}, a payment of {{2}} for deal {{3}} is due on {{4}}. — {{5}}"
    buildParameters: (c) => [
      c.client.fullName,
      c.schedule.amount,
      c.deal.dealNumber,
      c.schedule.dueDate,
      c.company.name,
    ],
  },
  payment_due_today: {
    name: 'payment_due_today',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    // Body: "Hi {{1}}, your payment of {{2}} for deal {{3}} is due today. — {{4}}"
    buildParameters: (c) => [
      c.client.fullName,
      c.schedule.amount,
      c.deal.dealNumber,
      c.company.name,
    ],
  },
  payment_overdue_1: {
    name: 'payment_overdue_1',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    // Body: "Hi {{1}}, your payment of {{2}} for deal {{3}} (due {{4}}) is now overdue. Please contact us to arrange payment. — {{5}}"
    buildParameters: (c) => [
      c.client.fullName,
      c.schedule.amount,
      c.deal.dealNumber,
      c.schedule.dueDate,
      c.company.name,
    ],
  },
  payment_overdue_7: {
    name: 'payment_overdue_7',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    // Body: "Hi {{1}}, your payment of {{2}} for deal {{3}} is now 7 days overdue. Please contact us as soon as possible. — {{4}}"
    buildParameters: (c) => [
      c.client.fullName,
      c.schedule.amount,
      c.deal.dealNumber,
      c.company.name,
    ],
  },
  payment_overdue_30: {
    name: 'payment_overdue_30',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    // Body: "Hi {{1}}, your payment of {{2}} for deal {{3}} is now 30 days overdue. Please contact us urgently to resolve this. — {{4}}"
    buildParameters: (c) => [
      c.client.fullName,
      c.schedule.amount,
      c.deal.dealNumber,
      c.company.name,
    ],
  },
};
