import { DocumentType } from '@/generated/prisma/client';
import { ReceiptTemplateContext } from './template-context.builder';
import { documentFormatter, documentLanguage } from './document-language';

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
  locale?: string | null;
};

export function sampleTemplateContext(
  company: CompanyDetails,
): ReceiptTemplateContext {
  const currency = company.currency ?? 'KGS';
  // E2E-3: printed the way the company's documents print them.
  const f = documentFormatter(documentLanguage(company.locale));
  const money = (value: number) => f.money(value, currency);
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
      financingType: f.financing('INSTALLMENT'),
      listPrice: money(62000),
      salePrice: money(58900),
      discountAmount: money(3100),
      discountPercent: '5',
      deposit: money(5000),
      reservedAt: f.date('2026-10-01'),
      reservationExpiresAt: f.date('2026-10-08'),
      contractNumber: 'C-2026-0042',
      contractDate: f.date('2026-10-05'),
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
      type: f.unitType('APARTMENT'),
      rooms: '2',
      area: f.number(62),
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
        { order: 1, dueDate: f.date('2026-11-05'), amount: money(5390) },
        { order: 2, dueDate: f.date('2026-12-05'), amount: money(5390) },
      ],
    },
    today: f.date('2026-10-16'),
    payment: {
      receiptNumber: 'R-2026-0042',
      date: f.date('2026-10-05'),
      amount: money(5000),
      method: f.paymentMethod('CASH'),
      type: f.paymentType('DEPOSIT'),
      reference: '',
      note: '',
      receivedBy: 'Nurgul Baktybekova',
    },
    totals: {
      paidToDate: money(5000),
      remaining: money(53900),
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
