import { buildWhatsAppTemplateRequest } from './whatsapp-message.provider';
import { buildReminderContext } from './reminder-context.builder';

const context = buildReminderContext({
  clientFullName: 'Jane Client',
  dealNumber: '2026-0001',
  scheduleAmount: 500,
  scheduleDueDate: new Date('2026-02-01'),
  companyName: 'Acme Homes',
});

describe('buildWhatsAppTemplateRequest', () => {
  it('strips non-digit characters from the recipient number', () => {
    const request = buildWhatsAppTemplateRequest(
      '+996 (700) 00-00-00',
      'payment_due_soon',
      context,
    );

    expect(request.to).toBe('996700000000');
  });

  it('maps a known reminder stage to its Meta template name and ordered parameters', () => {
    const request = buildWhatsAppTemplateRequest(
      '996700000000',
      'payment_due_soon',
      context,
    );

    expect(request.template.name).toBe('payment_due_soon');
    expect(
      request.template.components[0].parameters.map((p) => p.text),
    ).toEqual([
      'Jane Client',
      '500.00',
      '2026-0001',
      '2026-02-01',
      'Acme Homes',
    ]);
  });

  it('throws for a reminder stage with no approved WhatsApp template', () => {
    expect(() =>
      buildWhatsAppTemplateRequest('996700000000', 'not_a_real_stage', context),
    ).toThrow(/No WhatsApp template mapped/);
  });
});
