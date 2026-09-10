import { NotificationType } from '@/generated/prisma/client';

export interface ReminderStage {
  /** dueDate minus today, in whole days. Negative means overdue. */
  offsetDays: number;
  templateKey: string;
  notificationType: NotificationType;
  managerTitle: (dealNumber: string) => string;
  /** Only true at the escalation point where a team lead should also hear about it. */
  notifySalesHead?: boolean;
}

/**
 * The escalation timeline from the spec: T-3 days, due today, then overdue
 * at 1/7/30 days. Each entry fires at most once per schedule row — the cron
 * matches on exact offsetDays, not "within N days," so a daily run never
 * re-fires an already-passed stage.
 */
export const REMINDER_STAGES: ReminderStage[] = [
  {
    offsetDays: 3,
    templateKey: 'payment_due_soon',
    notificationType: NotificationType.PAYMENT_DUE_SOON,
    managerTitle: (dealNumber) => `Payment due soon for deal ${dealNumber}`,
  },
  {
    offsetDays: 0,
    templateKey: 'payment_due_today',
    notificationType: NotificationType.PAYMENT_DUE_SOON,
    managerTitle: (dealNumber) => `Payment due today for deal ${dealNumber}`,
  },
  {
    offsetDays: -1,
    templateKey: 'payment_overdue_1',
    notificationType: NotificationType.PAYMENT_OVERDUE,
    managerTitle: (dealNumber) => `Payment overdue for deal ${dealNumber}`,
  },
  {
    offsetDays: -7,
    templateKey: 'payment_overdue_7',
    notificationType: NotificationType.PAYMENT_OVERDUE,
    managerTitle: (dealNumber) =>
      `Payment 7 days overdue for deal ${dealNumber}`,
  },
  {
    offsetDays: -30,
    templateKey: 'payment_overdue_30',
    notificationType: NotificationType.PAYMENT_OVERDUE,
    managerTitle: (dealNumber) =>
      `Payment 30 days overdue for deal ${dealNumber}`,
    notifySalesHead: true,
  },
];
