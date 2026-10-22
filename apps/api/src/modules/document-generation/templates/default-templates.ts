import { DocumentType } from '@/generated/prisma/client';
import { DocumentLanguage } from '../document-language';

/**
 * Built-in fallback content, used whenever a company has no active
 * DocumentTemplate row for a given type. This is what makes generation work
 * from day one for every tenant without any admin setup — a company that
 * wants its own wording overrides these by creating a DocumentTemplate
 * (DocumentTemplatesService), which then takes precedence.
 *
 * These are deliberately plain — a real deployment should have its own
 * templates reviewed by whoever handles legal/compliance for that market
 * (see the spec's "legal review of default templates" risk). Shipping them
 * as *default* rather than *only* option is the point.
 *
 * E2E-3: written in English, Russian and Kyrgyz; a company gets the one for
 * its locale (documentLanguage). One layout per document, filled with each
 * language's words, so the three can't drift apart in structure.
 */
const SHARED_STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Onest', 'DejaVu Sans', Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    line-height: 1.5;
    margin: 0;
    padding: 32px 40px;
  }
  @page { size: A4; margin: 20mm 16mm; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .subtitle { color: #555; margin: 0 0 24px; }
  .parties { display: flex; gap: 32px; margin-bottom: 20px; }
  .party { flex: 1; }
  .party .label { font-size: 10px; text-transform: uppercase; color: #777; letter-spacing: 0.05em; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
  th { color: #555; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
  .totals { margin-top: 8px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .row.grand { font-weight: bold; border-top: 1px solid #1a1a1a; margin-top: 4px; padding-top: 6px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 56px; }
  .signature-block { width: 45%; }
  .signature-line { border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #555; }
  .note { margin-top: 20px; font-size: 10px; color: #777; }
`;

type Words = {
  taxId: string;
  passport: string;
  pin: string;
  note: string;
  project: string;
  unit: string;
  type: string;
  rooms: string;
  area: string;
  listPrice: string;
  discount: string;
  salePrice: string;
  reservation: {
    title: string;
    number: string;
    developer: string;
    client: string;
    reservedUnit: string;
    agreedPrice: string;
    depositPaid: string;
    terms: string;
    termsText: string;
    forDeveloper: string;
    asClient: string;
  };
  contract: {
    title: string;
    number: string;
    seller: string;
    buyer: string;
    subject: string;
    priceAndPayment: string;
    financing: string;
    schedule: string;
    dueDate: string;
    amount: string;
    forSeller: string;
    asBuyer: string;
  };
  receipt: {
    title: string;
    number: string;
    receivedBy: string;
    receivedFrom: string;
    description: string;
    paymentType: string;
    method: string;
    amount: string;
    paymentFor: string;
    dealLine: string;
    contractLine: string;
    reference: string;
    paidToDate: string;
    remaining: string;
    receivedFor: string;
    paidBy: string;
  };
};

const WORDS: Record<DocumentLanguage, Words> = {
  en: {
    taxId: 'Tax ID',
    passport: 'ID/Passport',
    pin: 'PIN',
    note: 'Note',
    project: 'Project',
    unit: 'Unit',
    type: 'Type',
    rooms: 'Rooms',
    area: 'Area',
    listPrice: 'List price',
    discount: 'Discount',
    salePrice: 'Sale price',
    reservation: {
      title: 'Unit Reservation Agreement',
      number: 'Reservation No.',
      developer: 'Developer',
      client: 'Client',
      reservedUnit: 'Reserved unit',
      agreedPrice: 'Agreed sale price',
      depositPaid: 'Deposit paid',
      terms: 'Terms',
      termsText:
        'The Developer holds the above unit for the Client until <strong>{{deal.reservationExpiresAt}}</strong>. The reservation lapses and the unit returns to available inventory if a sale contract is not signed by that date.',
      forDeveloper: 'for the Developer',
      asClient: 'Client',
    },
    contract: {
      title: 'Unit Sale Contract',
      number: 'Contract No.',
      seller: 'Seller',
      buyer: 'Buyer',
      subject: 'Subject of the contract',
      priceAndPayment: 'Price and payment',
      financing: 'Financing',
      schedule: 'Payment schedule',
      dueDate: 'Due date',
      amount: 'Amount',
      forSeller: 'for the Seller',
      asBuyer: 'Buyer',
    },
    receipt: {
      title: 'Payment Receipt',
      number: 'Receipt No.',
      receivedBy: 'Received by',
      receivedFrom: 'Received from',
      description: 'Description',
      paymentType: 'Type',
      method: 'Method',
      amount: 'Amount',
      paymentFor: 'Payment for unit No. {{unit.number}}, {{unit.projectName}}',
      dealLine: 'Deal {{deal.dealNumber}}',
      contractLine: ', contract No. {{deal.contractNumber}} of {{deal.contractDate}}',
      reference: 'Reference',
      paidToDate: 'Paid to date, including this payment',
      remaining: 'Remaining',
      receivedFor: 'Received by, for {{company.legalName}}',
      paidBy: 'Paid by',
    },
  },
  ru: {
    taxId: 'ИНН',
    passport: 'Паспорт',
    pin: 'ПИН',
    note: 'Примечание',
    project: 'Проект',
    unit: 'Помещение',
    type: 'Тип',
    rooms: 'Комнат',
    area: 'Площадь',
    listPrice: 'Цена по прайсу',
    discount: 'Скидка',
    salePrice: 'Цена продажи',
    reservation: {
      title: 'Договор бронирования помещения',
      number: 'Бронирование №',
      developer: 'Застройщик',
      client: 'Клиент',
      reservedUnit: 'Бронируемое помещение',
      agreedPrice: 'Согласованная цена продажи',
      depositPaid: 'Внесённый задаток',
      terms: 'Условия',
      termsText:
        'Застройщик сохраняет указанное помещение за Клиентом до <strong>{{deal.reservationExpiresAt}}</strong>. Если договор купли-продажи не подписан до этой даты, бронирование прекращается и помещение возвращается в продажу.',
      forDeveloper: 'от имени Застройщика',
      asClient: 'Клиент',
    },
    contract: {
      title: 'Договор купли-продажи помещения',
      number: 'Договор №',
      seller: 'Продавец',
      buyer: 'Покупатель',
      subject: 'Предмет договора',
      priceAndPayment: 'Цена и порядок оплаты',
      financing: 'Форма оплаты',
      schedule: 'График платежей',
      dueDate: 'Срок',
      amount: 'Сумма',
      forSeller: 'от имени Продавца',
      asBuyer: 'Покупатель',
    },
    receipt: {
      title: 'Квитанция об оплате',
      number: 'Квитанция №',
      receivedBy: 'Получатель',
      receivedFrom: 'Плательщик',
      description: 'Назначение платежа',
      paymentType: 'Вид',
      method: 'Способ',
      amount: 'Сумма',
      paymentFor: 'Оплата за помещение № {{unit.number}}, {{unit.projectName}}',
      dealLine: 'Сделка {{deal.dealNumber}}',
      contractLine: ', договор № {{deal.contractNumber}} от {{deal.contractDate}}',
      reference: 'Референс',
      paidToDate: 'Оплачено, включая этот платёж',
      remaining: 'Остаток к оплате',
      receivedFor: 'принял(а) от имени {{company.legalName}}',
      paidBy: 'плательщик',
    },
  },
  ky: {
    taxId: 'ИСН',
    passport: 'Паспорт',
    pin: 'ПИН',
    note: 'Эскертүү',
    project: 'Долбоор',
    unit: 'Жай',
    type: 'Түрү',
    rooms: 'Бөлмөлөр',
    area: 'Аянты',
    listPrice: 'Прайс боюнча баасы',
    discount: 'Арзандатуу',
    salePrice: 'Сатуу баасы',
    reservation: {
      title: 'Жайды брондоо келишими',
      number: 'Брондоо №',
      developer: 'Курулуш салуучу',
      client: 'Кардар',
      reservedUnit: 'Брондолгон жай',
      agreedPrice: 'Макулдашылган сатуу баасы',
      depositPaid: 'Төлөнгөн күрөө акы',
      terms: 'Шарттар',
      termsText:
        'Курулуш салуучу жогорудагы жайды Кардар үчүн <strong>{{deal.reservationExpiresAt}}</strong> чейин сактайт. Ушул күнгө чейин сатып алуу-сатуу келишимине кол коюлбаса, брондоо токтотулат жана жай кайра сатыкка чыгат.',
      forDeveloper: 'Курулуш салуучунун атынан',
      asClient: 'Кардар',
    },
    contract: {
      title: 'Жайды сатып алуу-сатуу келишими',
      number: 'Келишим №',
      seller: 'Сатуучу',
      buyer: 'Сатып алуучу',
      subject: 'Келишимдин предмети',
      priceAndPayment: 'Баасы жана төлөө тартиби',
      financing: 'Төлөө түрү',
      schedule: 'Төлөм графиги',
      dueDate: 'Мөөнөтү',
      amount: 'Сумма',
      forSeller: 'Сатуучунун атынан',
      asBuyer: 'Сатып алуучу',
    },
    receipt: {
      title: 'Төлөм квитанциясы',
      number: 'Квитанция №',
      receivedBy: 'Алуучу',
      receivedFrom: 'Төлөөчү',
      description: 'Төлөмдүн максаты',
      paymentType: 'Түрү',
      method: 'Ыкмасы',
      amount: 'Сумма',
      paymentFor: '№ {{unit.number}} жай үчүн төлөм, {{unit.projectName}}',
      dealLine: 'Бүтүм {{deal.dealNumber}}',
      contractLine: ', келишим № {{deal.contractNumber}}, {{deal.contractDate}}',
      reference: 'Шилтеме',
      paidToDate: 'Ушул төлөмдү кошо алганда төлөндү',
      remaining: 'Калдыгы',
      receivedFor: '{{company.legalName}} атынан кабыл алды',
      paidBy: 'Төлөөчү',
    },
  },
};

const page = (body: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${SHARED_STYLE}</style></head>
<body>
${body}
</body>
</html>`;

const signatory =
  '{{company.signatoryName}}{{#if company.signatoryTitle}}, {{company.signatoryTitle}}{{/if}}';

function reservationTemplate(w: Words): string {
  const r = w.reservation;
  return page(`  <h1>${r.title}</h1>
  <p class="subtitle">${r.number} {{deal.dealNumber}}{{#if deal.reservedAt}} &middot; {{deal.reservedAt}}{{/if}}</p>

  <div class="parties">
    <div class="party">
      <div class="label">${r.developer}</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>${w.taxId}: {{company.taxId}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">${r.client}</div>
      <div>{{client.fullName}}</div>
      <div>{{client.phone}}</div>
      {{#if client.address}}<div>{{client.address}}</div>{{/if}}
      {{#if client.passport}}<div>${w.passport}: {{client.passport}}</div>{{/if}}
    </div>
  </div>

  <h2>${r.reservedUnit}</h2>
  <table>
    <tr><th>${w.project}</th><th>${w.unit}</th><th>${w.type}</th><th>${w.area}</th><th>${w.listPrice}</th></tr>
    <tr>
      <td>{{unit.projectName}}</td>
      <td>{{unit.number}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.area}} m&sup2;</td>
      <td>{{deal.listPrice}}</td>
    </tr>
  </table>

  <div class="totals">
    <div class="row"><span>${r.agreedPrice}</span><span>{{deal.salePrice}}</span></div>
    {{#if deal.discountAmount}}<div class="row"><span>${w.discount}</span><span>-{{deal.discountAmount}}</span></div>{{/if}}
    {{#if deal.deposit}}<div class="row grand"><span>${r.depositPaid}</span><span>{{deal.deposit}}</span></div>{{/if}}
  </div>

  <h2>${r.terms}</h2>
  <p>${r.termsText}</p>
  {{#if deal.note}}<p class="note">${w.note}: {{deal.note}}</p>{{/if}}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">${signatory} — ${r.forDeveloper}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — ${r.asClient}</div>
    </div>
  </div>`);
}

function contractTemplate(w: Words): string {
  const c = w.contract;
  return page(`  <h1>${c.title}</h1>
  <p class="subtitle">${c.number} {{deal.contractNumber}} &middot; {{deal.contractDate}}</p>

  <div class="parties">
    <div class="party">
      <div class="label">${c.seller}</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>${w.taxId}: {{company.taxId}}</div>{{/if}}
      {{#if company.phone}}<div>{{company.phone}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">${c.buyer}</div>
      <div>{{client.fullName}}</div>
      <div>{{client.phone}}</div>
      {{#if client.address}}<div>{{client.address}}</div>{{/if}}
      {{#if client.passport}}<div>${w.passport}: {{client.passport}}</div>{{/if}}
      {{#if client.pin}}<div>${w.pin}: {{client.pin}}</div>{{/if}}
    </div>
  </div>

  <h2>${c.subject}</h2>
  <table>
    <tr><th>${w.project}</th><th>${w.unit}</th><th>${w.type}</th><th>${w.rooms}</th><th>${w.area}</th></tr>
    <tr>
      <td>{{unit.projectName}}</td>
      <td>{{unit.blockName}} / {{unit.number}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.rooms}}</td>
      <td>{{unit.area}} m&sup2;</td>
    </tr>
  </table>

  <h2>${c.priceAndPayment}</h2>
  <div class="totals">
    <div class="row"><span>${w.listPrice}</span><span>{{deal.listPrice}}</span></div>
    {{#if deal.discountAmount}}<div class="row"><span>${w.discount} ({{deal.discountPercent}}%)</span><span>-{{deal.discountAmount}}</span></div>{{/if}}
    <div class="row grand"><span>${w.salePrice}</span><span>{{deal.salePrice}}</span></div>
    {{#if deal.financingType}}<div class="row"><span>${c.financing}</span><span>{{deal.financingType}}</span></div>{{/if}}
  </div>

  {{#if schedule.rows}}
  <h2>${c.schedule}</h2>
  <table>
    <tr><th>#</th><th>${c.dueDate}</th><th>${c.amount}</th></tr>
    {{#each schedule.rows}}
    <tr><td>{{order}}</td><td>{{dueDate}}</td><td>{{amount}}</td></tr>
    {{/each}}
  </table>
  {{/if}}

  {{#if deal.note}}<p class="note">${w.note}: {{deal.note}}</p>{{/if}}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">${signatory} — ${c.forSeller}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — ${c.asBuyer}</div>
    </div>
  </div>`);
}

function receiptTemplate(w: Words): string {
  const r = w.receipt;
  return page(`  <h1>${r.title}</h1>
  <p class="subtitle">${r.number} {{payment.receiptNumber}} &middot; {{payment.date}}</p>

  <div class="parties">
    <div class="party">
      <div class="label">${r.receivedBy}</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>${w.taxId}: {{company.taxId}}</div>{{/if}}
      {{#if company.phone}}<div>{{company.phone}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">${r.receivedFrom}</div>
      <div>{{client.fullName}}</div>
      {{#if client.passport}}<div>${w.passport}: {{client.passport}}</div>{{/if}}
      {{#if client.pin}}<div>${w.pin}: {{client.pin}}</div>{{/if}}
      <div>{{client.phone}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>${r.description}</th><th>${r.paymentType}</th><th>${r.method}</th><th style="text-align:right">${r.amount}</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>
          ${r.paymentFor}<br>
          ${r.dealLine}{{#if deal.contractNumber}}${r.contractLine}{{/if}}
          {{#if payment.reference}}<br>${r.reference}: {{payment.reference}}{{/if}}
        </td>
        <td>{{payment.type}}</td>
        <td>{{payment.method}}</td>
        <td style="text-align:right"><strong>{{payment.amount}}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>${w.salePrice}</span><span>{{deal.salePrice}}</span></div>
    <div class="row"><span>${r.paidToDate}</span><span>{{totals.paidToDate}}</span></div>
    <div class="row grand"><span>${r.remaining}</span><span>{{totals.remaining}}</span></div>
  </div>

  {{#if payment.note}}<p class="note">${w.note}: {{payment.note}}</p>{{/if}}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{payment.receivedBy}} — ${r.receivedFor}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — ${r.paidBy}</div>
    </div>
  </div>`);
}

function templatesFor(
  language: DocumentLanguage,
): Partial<Record<DocumentType, string>> {
  const w = WORDS[language];
  return {
    [DocumentType.RESERVATION]: reservationTemplate(w),
    [DocumentType.CONTRACT]: contractTemplate(w),
    [DocumentType.PAYMENT_RECEIPT]: receiptTemplate(w),
  };
}

const BY_LANGUAGE: Record<
  DocumentLanguage,
  Partial<Record<DocumentType, string>>
> = {
  en: templatesFor('en'),
  ru: templatesFor('ru'),
  ky: templatesFor('ky'),
};

/** The built-in template for `type` in a company's document language. */
export function defaultTemplate(
  type: DocumentType,
  language: DocumentLanguage,
): string | undefined {
  return BY_LANGUAGE[language][type];
}

/** The English built-ins. */
export const DEFAULT_TEMPLATES = BY_LANGUAGE.en;
