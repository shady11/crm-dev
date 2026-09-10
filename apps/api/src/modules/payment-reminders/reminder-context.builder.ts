import { Prisma } from '@/generated/prisma/client';

export interface ReminderContext {
  client: { fullName: string };
  deal: { dealNumber: string };
  schedule: { amount: string; dueDate: string };
  company: { name: string };
}

function money(value: Prisma.Decimal | number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function date(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildReminderContext(params: {
  clientFullName: string;
  dealNumber: string;
  scheduleAmount: Prisma.Decimal | number;
  scheduleDueDate: Date;
  companyName: string;
}): ReminderContext {
  return {
    client: { fullName: params.clientFullName },
    deal: { dealNumber: params.dealNumber },
    schedule: {
      amount: money(params.scheduleAmount),
      dueDate: date(params.scheduleDueDate),
    },
    company: { name: params.companyName },
  };
}
