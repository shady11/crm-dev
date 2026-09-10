/**
 * Short, SMS/WhatsApp-length text — not the HTML+PDF templates used by
 * document-generation. Keyed by templateKey, referenced from both
 * REMINDER_STAGES (payment-reminders.constants.ts) and the OutboundMessage
 * row each render produces, so a sent message is always traceable to
 * exactly which wording fired it.
 */
export const REMINDER_TEMPLATES: Record<string, string> = {
  payment_due_soon:
    'Hi {{client.fullName}}, a payment of {{schedule.amount}} for deal {{deal.dealNumber}} is due on {{schedule.dueDate}}. — {{company.name}}',
  payment_due_today:
    'Hi {{client.fullName}}, your payment of {{schedule.amount}} for deal {{deal.dealNumber}} is due today. — {{company.name}}',
  payment_overdue_1:
    'Hi {{client.fullName}}, your payment of {{schedule.amount}} for deal {{deal.dealNumber}} (due {{schedule.dueDate}}) is now overdue. Please contact us to arrange payment. — {{company.name}}',
  payment_overdue_7:
    'Hi {{client.fullName}}, your payment of {{schedule.amount}} for deal {{deal.dealNumber}} is now 7 days overdue. Please contact us as soon as possible. — {{company.name}}',
  payment_overdue_30:
    'Hi {{client.fullName}}, your payment of {{schedule.amount}} for deal {{deal.dealNumber}} is now 30 days overdue. Please contact us urgently to resolve this. — {{company.name}}',
};
