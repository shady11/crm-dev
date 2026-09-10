import { OutboundMessageService } from './outbound-message.service';
import {
  OutboundChannel,
  OutboundMessageStatus,
} from '@/generated/prisma/client';

const client = {
  id: 'client-1',
  fullName: 'Jane Client',
  whatsapp: null as string | null,
  phone: '+996700000000',
  email: null as string | null,
};

function build() {
  const prisma = {
    outboundMessage: {
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'msg-1', ...data }),
        ),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  const provider = {
    send: jest.fn().mockResolvedValue({ providerMessageId: 'provider-123' }),
  };

  const service = new OutboundMessageService(prisma as any, provider);
  return { service, prisma, provider };
}

const baseParams = {
  companyId: 'company-1',
  companyName: 'Acme Homes',
  client,
  dealNumber: '2026-0001',
  scheduleId: 'schedule-1',
  scheduleAmount: 500,
  scheduleDueDate: new Date('2026-09-15'),
  templateKey: 'payment_due_soon',
};

describe('OutboundMessageService', () => {
  it('picks SMS when the client has no WhatsApp number', async () => {
    const { service, provider } = build();

    await service.sendReminder(baseParams);

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: OutboundChannel.SMS,
        to: client.phone,
      }),
    );
  });

  it('prefers WhatsApp when the client has a WhatsApp number', async () => {
    const { service, provider } = build();

    await service.sendReminder({
      ...baseParams,
      client: { ...client, whatsapp: '+996700000099' },
    });

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: OutboundChannel.WHATSAPP,
        to: '+996700000099',
      }),
    );
  });

  it('renders the template with the client name, deal number, and amount', async () => {
    const { service, provider } = build();

    await service.sendReminder(baseParams);

    const [[sentArgs]] = provider.send.mock.calls as [[{ body: string }]];
    const sentBody = sentArgs.body;
    expect(sentBody).toContain('Jane Client');
    expect(sentBody).toContain('2026-0001');
    expect(sentBody).toContain('500.00');
  });

  it('logs a SENT record with the provider message id on success', async () => {
    const { service, prisma } = build();

    const message = await service.sendReminder(baseParams);

    const [[createArgs]] = prisma.outboundMessage.create.mock.calls as [
      [{ data: Record<string, unknown> }],
    ];
    expect(createArgs.data).toMatchObject({
      status: OutboundMessageStatus.SENT,
      providerMessageId: 'provider-123',
      paymentScheduleId: 'schedule-1',
      templateKey: 'payment_due_soon',
    });
    expect(message).toMatchObject({ status: OutboundMessageStatus.SENT });
  });

  it('logs a FAILED record instead of throwing when the provider rejects', async () => {
    const { service, provider } = build();
    provider.send.mockRejectedValue(new Error('gateway timeout'));

    const message = await service.sendReminder(baseParams);

    expect(message).toMatchObject({
      status: OutboundMessageStatus.FAILED,
      failureReason: 'gateway timeout',
    });
  });

  it('rejects an unknown template key', async () => {
    const { service } = build();

    await expect(
      service.sendReminder({
        ...baseParams,
        templateKey: 'not_a_real_template',
      }),
    ).rejects.toThrow(/No reminder template registered/);
  });

  it('alreadySentToday reflects whether a matching message exists since midnight', async () => {
    const { service, prisma } = build();

    expect(
      await service.alreadySentToday('schedule-1', 'payment_due_soon'),
    ).toBe(false);

    prisma.outboundMessage.findFirst.mockResolvedValue({ id: 'existing' });
    expect(
      await service.alreadySentToday('schedule-1', 'payment_due_soon'),
    ).toBe(true);
  });
});
