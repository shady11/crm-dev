import { PaymentReminderCronService } from './payment-reminder-cron.service';
import {
  NotificationEntityType,
  PaymentScheduleStatus,
  UserRole,
} from '@/generated/prisma/client';

function daysFromToday(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function scheduleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'schedule-1',
    dueDate: daysFromToday(0),
    amount: 500,
    status: PaymentScheduleStatus.PENDING,
    deal: {
      id: 'deal-1',
      dealNumber: '2026-0001',
      companyId: 'company-1',
      managerId: 'manager-1',
      branchId: 'branch-1',
      client: {
        id: 'client-1',
        fullName: 'Jane Client',
        whatsapp: null,
        phone: '+996700000000',
        email: null,
      },
      company: { name: 'Acme Homes' },
    },
    ...overrides,
  };
}

function build(schedules: ReturnType<typeof scheduleRow>[]) {
  const prisma = {
    paymentSchedule: {
      findMany: jest.fn().mockResolvedValue(schedules),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  const outboundMessages = {
    alreadySentToday: jest.fn().mockResolvedValue(false),
    sendReminder: jest.fn().mockResolvedValue({ id: 'msg-1' }),
  };
  const notifications = {
    create: jest.fn().mockResolvedValue({}),
  };

  const service = new PaymentReminderCronService(
    prisma as any,
    outboundMessages as any,
    notifications as any,
  );
  return { service, prisma, outboundMessages, notifications };
}

describe('PaymentReminderCronService', () => {
  it('flips a schedule to OVERDUE once its due date has passed, even off the reminder timeline', async () => {
    const { service, prisma } = build([
      scheduleRow({ dueDate: daysFromToday(-5) }),
    ]);

    await service.runDailyReminders();

    expect(prisma.paymentSchedule.update).toHaveBeenCalledWith({
      where: { id: 'schedule-1' },
      data: { status: PaymentScheduleStatus.OVERDUE },
    });
  });

  it('does not re-flip a schedule already marked OVERDUE', async () => {
    const { service, prisma } = build([
      scheduleRow({
        dueDate: daysFromToday(-5),
        status: PaymentScheduleStatus.OVERDUE,
      }),
    ]);

    await service.runDailyReminders();

    expect(prisma.paymentSchedule.update).not.toHaveBeenCalled();
  });

  it('sends a reminder and notifies the manager on an exact escalation day', async () => {
    const { service, outboundMessages, notifications } = build([
      scheduleRow({ dueDate: daysFromToday(0) }),
    ]);

    await service.runDailyReminders();

    expect(outboundMessages.sendReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'payment_due_today',
        scheduleId: 'schedule-1',
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        entityType: NotificationEntityType.PAYMENT_SCHEDULE,
        entityId: 'schedule-1',
      }),
    );
  });

  it('does nothing for a day that is not on the reminder timeline', async () => {
    const { service, outboundMessages, notifications } = build([
      scheduleRow({ dueDate: daysFromToday(2) }),
    ]);

    await service.runDailyReminders();

    expect(outboundMessages.sendReminder).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('skips both the client reminder and the manager notification when already sent today', async () => {
    const { service, outboundMessages, notifications } = build([
      scheduleRow({ dueDate: daysFromToday(0) }),
    ]);
    outboundMessages.alreadySentToday.mockResolvedValue(true);

    await service.runDailyReminders();

    expect(outboundMessages.sendReminder).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('skips the manager notification if one already fired in the last 24h', async () => {
    const { service, notifications, prisma } = build([
      scheduleRow({ dueDate: daysFromToday(0) }),
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

    await service.runDailyReminders();

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('additionally notifies the branch sales head at the 30-day overdue escalation', async () => {
    const { service, prisma, notifications } = build([
      scheduleRow({
        dueDate: daysFromToday(-30),
        status: PaymentScheduleStatus.OVERDUE,
      }),
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'sales-head-1' }]);

    await service.runDailyReminders();

    const [[findManyArgs]] = prisma.user.findMany.mock.calls as [
      [{ where: Record<string, unknown> }],
    ];
    expect(findManyArgs.where).toMatchObject({
      branchId: 'branch-1',
      role: UserRole.SALES_HEAD,
      isActive: true,
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'sales-head-1' }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'manager-1' }),
    );
  });

  it('does not notify a sales head for an earlier escalation stage', async () => {
    const { service, prisma } = build([
      scheduleRow({ dueDate: daysFromToday(0) }),
    ]);

    await service.runDailyReminders();

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
