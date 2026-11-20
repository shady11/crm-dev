import { PaymentScheduleStatus, Prisma } from '@/generated/prisma/client';

type ScheduleUpdater = {
  paymentSchedule: {
    updateMany(
      args: Prisma.PaymentScheduleUpdateManyArgs,
    ): Promise<{ count: number }>;
  };
};

/** Midnight at the start of today, server time: the day an installment falls due. */
export function startOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Flips every unpaid installment due before today to OVERDUE.
 *
 * Overdue used to be set only by the 8 AM reminder run, so an installment
 * that fell due overnight, or a schedule entered with past dates (an
 * existing contract brought into the CRM), read "pending" on the deal, the
 * dashboard and the receivables export until the next morning, while the
 * deal's header already said "overdue since". The reminder job's own check
 * is the same rule.
 */
export async function markOverdueInstallments(
  db: ScheduleUpdater,
  now: Date = new Date(),
): Promise<number> {
  const { count } = await db.paymentSchedule.updateMany({
    where: {
      deletedAt: null,
      status: {
        in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL],
      },
      dueDate: { lt: startOfToday(now) },
      deal: { deletedAt: null },
    },
    data: { status: PaymentScheduleStatus.OVERDUE },
  });
  return count;
}
