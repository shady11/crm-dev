import * as Handlebars from 'handlebars';
import { DocumentType, Prisma } from '@/generated/prisma/client';
import { documentFormatter, documentLanguage } from './document-language';
import { defaultTemplate } from './templates/default-templates';
import { sampleTemplateContext } from './template-samples';
import { buildReceiptContext, buildTemplateContext } from './template-context.builder';

describe('documentLanguage (E2E-3)', () => {
  it("follows the company's locale, and falls back to English", () => {
    expect(documentLanguage('ru-RU')).toBe('ru');
    expect(documentLanguage('ky-KG')).toBe('ky');
    expect(documentLanguage('ky')).toBe('ky');
    expect(documentLanguage('en-US')).toBe('en');
    expect(documentLanguage('kk-KZ')).toBe('en');
    expect(documentLanguage(null)).toBe('en');
  });
});

describe('documentFormatter (E2E-3)', () => {
  it('keeps the English formats documents always printed', () => {
    const f = documentFormatter('en');
    expect(f.money(5022000, 'KGS')).toBe('5,022,000.00 KGS');
    expect(f.date(new Date('2026-10-21T00:00:00Z'))).toBe('2026-10-21');
    expect(f.unitType('APARTMENT')).toBe('Apartment');
  });

  it('prints Russian documents the local way, in words', () => {
    const f = documentFormatter('ru');
    // ru-RU groups with a no-break space and uses a decimal comma.
    expect(f.money(5022000, 'KGS').replace(/\s/g, ' ')).toBe('5 022 000,00 KGS');
    expect(f.date(new Date('2026-10-21T00:00:00Z'))).toBe('21.10.2026');
    expect(f.number(new Prisma.Decimal('65.5'))).toBe('65,5');
    expect(f.unitType('APARTMENT')).toBe('Квартира');
    expect(f.financing('INSTALLMENT')).toBe('Рассрочка');
    expect(f.paymentMethod('BANK_TRANSFER')).toBe('Банковский перевод');
    expect(f.paymentType('DEPOSIT')).toBe('Задаток');
  });

  it('has Kyrgyz words, and leaves an unknown code and an empty value as they are', () => {
    const f = documentFormatter('ky');
    expect(f.paymentMethod('CASH')).toBe('Накталай');
    expect(f.unitType('PARKING')).toBe('Унаа токтотуучу жай');
    expect(f.financing(null)).toBe('');
    expect(f.paymentType('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('built-in templates (E2E-3)', () => {
  const company = {
    name: 'Ала-Тоо Строй',
    legalName: 'ОсОО «Ала-Тоо Строй»',
    address: 'Бишкек',
    phone: null,
    taxId: '01234567891011',
    signatoryName: 'Асель Токтогулова',
    signatoryTitle: 'Директор',
    currency: 'KGS',
  };
  const types = [
    DocumentType.RESERVATION,
    DocumentType.CONTRACT,
    DocumentType.PAYMENT_RECEIPT,
  ];

  it.each(['en', 'ru', 'ky'] as const)(
    'fill in without a missing placeholder (%s)',
    (language) => {
      const locale = { en: 'en-US', ru: 'ru-RU', ky: 'ky-KG' }[language];
      const context = sampleTemplateContext({ ...company, locale });
      for (const type of types) {
        const html = Handlebars.compile(defaultTemplate(type, language)!, {
          strict: true,
        })(context);
        expect(html).not.toContain('{{');
      }
    },
  );

  it('are in the language asked for', () => {
    expect(defaultTemplate(DocumentType.CONTRACT, 'ru')).toContain(
      'Договор купли-продажи помещения',
    );
    expect(defaultTemplate(DocumentType.CONTRACT, 'ky')).toContain(
      'Жайды сатып алуу-сатуу келишими',
    );
    expect(defaultTemplate(DocumentType.CONTRACT, 'en')).toContain(
      'Unit Sale Contract',
    );
  });

  it('leave out the financing line when the deal has none', () => {
    const contract = defaultTemplate(DocumentType.CONTRACT, 'ru')!;
    const context = sampleTemplateContext({ ...company, locale: 'ru-RU' });
    const withoutFinancing = Handlebars.compile(contract, { strict: true })({
      ...context,
      deal: { ...context.deal, financingType: '' },
    });
    expect(withoutFinancing).not.toContain('Форма оплаты');
    expect(Handlebars.compile(contract, { strict: true })(context)).toContain(
      'Форма оплаты',
    );
  });
});

describe('a Russian-locale company gets Russian values (E2E-3)', () => {
  it('prints the receipt in words and local formats', () => {
    const day = new Date('2026-10-21T00:00:00.000Z');
    const deal = {
      dealNumber: 'D-2026-0001', status: 'ACTIVE', financingType: 'INSTALLMENT',
      listPrice: new Prisma.Decimal(5400000), salePrice: new Prisma.Decimal(5022000),
      discountAmount: new Prisma.Decimal(378000), discountPercent: new Prisma.Decimal(7),
      deposit: null, reservedAt: day, reservationExpiresAt: day, contractNumber: 'ДКП-1',
      contractDate: day, note: null,
      client: { fullName: 'Нурлан Асанов', phone: '+996555123456', email: null, passport: 'ID1', pin: '2', address: null },
      unit: { number: '201', type: 'APARTMENT', rooms: 2, area: new Prisma.Decimal('65.5'), block: { name: 'Блок А' }, entrance: { name: '1' }, floor: { number: 2 } },
      project: { name: 'ЖК Ала-Тоо' }, manager: null, paymentSchedules: [],
      payments: [{ id: 'p1', amount: new Prisma.Decimal(787000), paidAt: day, createdAt: day }],
    };
    const payment = {
      ...deal.payments[0], receiptNumber: 'R-2026-0002', paymentMethod: 'BANK_TRANSFER',
      paymentType: 'INSTALLMENT', reference: null, note: null, user: { fullName: 'Динара' },
    };

    const context = buildReceiptContext(
      deal as never,
      { name: 'Ала-Тоо', legalName: null, currency: 'KGS', locale: 'ru-RU' } as never,
      payment as never,
    );

    expect(context.payment.method).toBe('Банковский перевод');
    expect(context.payment.date).toBe('21.10.2026');
    expect(context.unit.type).toBe('Квартира');
    expect(context.unit.area).toBe('65,5');
    expect(context.deal.financingType).toBe('Рассрочка');
    expect(context.deal.salePrice.replace(/\s/g, ' ')).toBe('5 022 000,00 KGS');
    expect(context.deal.discountPercent).toBe('7');
  });

  it('leaves the discount out when there is none, instead of "-0,00"', () => {
    const deal = {
      dealNumber: 'D-1', status: 'RESERVED', financingType: null,
      listPrice: new Prisma.Decimal(100), salePrice: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0), discountPercent: new Prisma.Decimal(0),
      deposit: null, reservedAt: null, reservationExpiresAt: null, contractNumber: null, contractDate: null, note: null,
      client: { fullName: 'A', phone: '1', email: null, passport: null, pin: null, address: null },
      unit: { number: '1', type: 'APARTMENT', rooms: null, area: new Prisma.Decimal(1), block: { name: 'A' }, entrance: { name: '1' }, floor: { number: 1 } },
      project: { name: 'P' }, manager: null, paymentSchedules: [], payments: [],
    };
    const context = buildTemplateContext(deal as never, { name: 'C', currency: 'KGS', locale: 'ru-RU' } as never);
    expect(context.deal.discountAmount).toBe('');
    expect(context.deal.discountPercent).toBe('');
  });
});
