import { DocumentType } from '@/generated/prisma/client';
import { ReceiptTemplateContext } from './template-context.builder';

/**
 * CA-5: what the template editor previews with and checks a template
 * against before saving. Generation compiles templates in strict mode, so a
 * misspelt placeholder would otherwise only fail when someone generates a
 * contract. The company block comes from the company's own saved details
 * (the reader sees their real legal name and signatory); the deal, client
 * and payment are an example.
 */
type CompanyDetails = {
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  currency: string | null;
};

export function sampleTemplateContext(
  company: CompanyDetails,
): ReceiptTemplateContext {
  const currency = company.currency ?? 'KGS';
  return {
    company: {
      name: company.name,
      legalName: company.legalName ?? company.name,
      address: company.address ?? '',
      phone: company.phone ?? '',
      taxId: company.taxId ?? '',
      signatoryName: company.signatoryName ?? '',
      signatoryTitle: company.signatoryTitle ?? '',
      currency,
    },
    deal: {
      dealNumber: 'D-2026-0042',
      status: 'CONTRACT_SIGNED',
      financingType: 'INSTALLMENT',
      listPrice: `62,000.00 ${currency}`,
      salePrice: `58,900.00 ${currency}`,
      discountAmount: `3,100.00 ${currency}`,
      discountPercent: '5',
      deposit: `5,000.00 ${currency}`,
      reservedAt: '2026-10-01',
      reservationExpiresAt: '2026-10-08',
      contractNumber: 'C-2026-0042',
      contractDate: '2026-10-05',
      note: '',
    },
    client: {
      fullName: 'Айгерим Токтогулова',
      phone: '+996555123456',
      email: 'aigerim@example.com',
      passport: 'AN1234567',
      pin: '21234567890123',
      address: 'Бишкек, ул. Токтогула 12, кв. 5',
    },
    unit: {
      number: '504',
      type: 'APARTMENT',
      rooms: '2',
      area: '62.00',
      projectName: 'ЖК Орион',
      blockName: 'A',
      entranceName: '1',
      floorNumber: '5',
    },
    manager: {
      fullName: 'Aidana Rysbekov',
      phone: '+996700100111',
      email: 'sales.manager.1.1@crm.dev',
    },
    schedule: {
      rows: [
        { order: 1, dueDate: '2026-11-05', amount: `5,390.00 ${currency}` },
        { order: 2, dueDate: '2026-12-05', amount: `5,390.00 ${currency}` },
      ],
    },
    today: '2026-10-16',
    payment: {
      receiptNumber: 'R-2026-0042',
      date: '2026-10-05',
      amount: `5,000.00 ${currency}`,
      method: 'Cash',
      type: 'Down payment',
      reference: '',
      note: '',
      receivedBy: 'Nurgul Baktybekova',
    },
    totals: {
      paidToDate: `5,000.00 ${currency}`,
      remaining: `53,900.00 ${currency}`,
    },
  };
}

export type TemplatePlaceholder = { token: string; example: string };

/**
 * Every value a template of `type` can use, as the {{token}} to paste and an
 * example of what it prints. The payment and totals blocks exist only on a
 * receipt; the schedule rows are a list, offered as an {{#each}} block.
 */
export function templatePlaceholders(
  type: DocumentType,
  context: ReceiptTemplateContext,
): TemplatePlaceholder[] {
  const { payment, totals, schedule, today, ...base } = context;
  const sections: Record<
    string,
    Record<string, string | number | null | undefined>
  > = {
    ...base,
    ...(type === DocumentType.PAYMENT_RECEIPT ? { payment, totals } : {}),
  };

  const placeholders: TemplatePlaceholder[] = [];
  for (const [section, values] of Object.entries(sections)) {
    for (const [field, value] of Object.entries(values)) {
      placeholders.push({
        token: `{{${section}.${field}}}`,
        example: value == null ? '' : String(value),
      });
    }
  }
  placeholders.push({ token: '{{today}}', example: today });
  placeholders.push({
    token:
      '{{#each schedule.rows}}{{order}}. {{dueDate}} — {{amount}}{{/each}}',
    example: schedule.rows
      .map((r) => `${r.order}. ${r.dueDate} — ${r.amount}`)
      .join('; '),
  });
  return placeholders;
}
