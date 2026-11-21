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
  .clause { margin: 6px 0; text-align: justify; }
`;

type Words = {
  taxId: string;
  passport: string;
  pin: string;
  note: string;
  project: string;
  // The square-metre sign in the language's own script.
  sqm: string;
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
    // E2E-22: the clauses every sale needs; a lawyer adjusts them in the
    // template editor.
    subject1: string;
    entrance: string;
    floor: string;
    deposit: string;
    payInFull: string;
    payBySchedule: string;
    payWhere: string;
    handover: string;
    handover1: string;
    handover2: string;
    duties: string;
    sellerDuties: string;
    buyerDuties: string;
    liability: string;
    liability1: string;
    liability2: string;
    liability3: string;
    details: string;
    bank: string;
    account: string;
    bic: string;
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
  // E2E-5: the schedule can only be made after the contract is signed, so
  // it goes to the client as an annex to the contract.
  schedule: {
    title: string;
    annexTo: string;
    paidBefore: string;
    toPay: string;
    total: string;
    termsText: string;
  };
};

const WORDS: Record<DocumentLanguage, Words> = {
  en: {
    taxId: 'Tax ID',
    passport: 'ID/Passport',
    pin: 'PIN',
    note: 'Note',
    project: 'Project',
    sqm: 'm&sup2;',
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
      subject1: "The Seller undertakes to transfer the unit described below to the Buyer's ownership, and the Buyer undertakes to accept it and pay for it. The unit is in «{{unit.projectName}}»{{#if project.address}} at {{project.address}}{{/if}}.",
      entrance: "Entrance",
      floor: "Floor",
      deposit: "The deposit of {{deal.deposit}} paid by the Buyer counts towards the price.",
      payInFull: "The price is paid in one sum within 10 (ten) banking days of signing this contract.",
      payBySchedule: "The price is paid in the amounts and on the dates set by the payment schedule, an annex to and an integral part of this contract.",
      payWhere: "Payment is made to the Seller's bank account given in section 6 or at the Seller's cash desk. A payment counts as made on the day the money is received.",
      handover: "Handover",
      handover1: "The Seller hands the unit over to the Buyer by a handover act after the building is put into operation{{#if project.handoverDate}}, no later than {{project.handoverDate}}{{/if}}, once the price is paid in full.",
      handover2: "Ownership passes to the Buyer on state registration.",
      duties: "Obligations of the parties",
      sellerDuties: "The Seller shall hand over the unit in the condition set by the project documents, and shall not sell or encumber it to third parties while this contract is in force.",
      buyerDuties: "The Buyer shall pay the price as set out in section 2 and accept the unit by the handover act.",
      liability: "Liability and termination",
      liability1: "For late payment and late handover the parties are liable as provided by the law of the Kyrgyz Republic.",
      liability2: "The contract may be terminated by agreement of the parties or in the cases provided by law.",
      liability3: "Disputes are settled by negotiation, failing which in court at the Seller's location.",
      details: "Details of the parties",
      bank: "Bank",
      account: "Account",
      bic: "BIC",
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
      paymentFor: 'Payment for unit {{unit.blockName}} / {{unit.number}}, {{unit.projectName}}',
      dealLine: 'Deal {{deal.dealNumber}}',
      contractLine:
        ', contract No. {{deal.contractNumber}} of {{deal.contractDate}}',
      reference: 'Reference',
      paidToDate: 'Paid to date, including this payment',
      remaining: 'Remaining',
      receivedFor: 'Received by, for {{company.legalName}}',
      paidBy: 'Paid by',
    },
    schedule: {
      title: 'Payment Schedule',
      annexTo:
        'Annex to contract No. {{deal.contractNumber}} of {{deal.contractDate}}',
      paidBefore: 'Paid before this schedule',
      toPay: 'To be paid by this schedule',
      total: 'Total',
      termsText:
        'The Buyer pays the amounts above by the dates shown. This schedule forms part of the contract named above.',
    },
  },
  ru: {
    taxId: 'ИНН',
    passport: 'Паспорт',
    pin: 'ПИН',
    note: 'Примечание',
    project: 'Проект',
    sqm: 'м&sup2;',
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
      subject1: "Продавец обязуется передать в собственность Покупателя, а Покупатель — принять и оплатить помещение, указанное ниже, в объекте «{{unit.projectName}}»{{#if project.address}} по адресу: {{project.address}}{{/if}}.",
      entrance: "Подъезд",
      floor: "Этаж",
      deposit: "Внесённый Покупателем задаток {{deal.deposit}} засчитывается в счёт цены.",
      payInFull: "Цена оплачивается единовременно в течение 10 (десяти) банковских дней с даты подписания настоящего договора.",
      payBySchedule: "Цена оплачивается в размерах и в сроки, установленные графиком платежей — приложением к настоящему договору, являющимся его неотъемлемой частью.",
      payWhere: "Оплата производится на расчётный счёт Продавца, указанный в разделе 6, или в кассу Продавца. Платёж считается совершённым в день поступления денежных средств.",
      handover: "Передача помещения",
      handover1: "Продавец передаёт помещение Покупателю по акту приёма-передачи после ввода объекта в эксплуатацию{{#if project.handoverDate}}, не позднее {{project.handoverDate}}{{/if}}, при условии полной оплаты цены.",
      handover2: "Право собственности переходит к Покупателю с момента государственной регистрации.",
      duties: "Обязанности сторон",
      sellerDuties: "Продавец обязуется передать помещение в состоянии, соответствующем проектной документации, и не отчуждать и не обременять его правами третьих лиц в период действия договора.",
      buyerDuties: "Покупатель обязуется оплатить цену в порядке, установленном разделом 2, и принять помещение по акту приёма-передачи.",
      liability: "Ответственность и расторжение",
      liability1: "За просрочку оплаты и передачи помещения стороны несут ответственность в соответствии с законодательством Кыргызской Республики.",
      liability2: "Договор может быть расторгнут по соглашению сторон или в случаях, предусмотренных законодательством.",
      liability3: "Споры разрешаются путём переговоров, а при недостижении согласия — в суде по месту нахождения Продавца.",
      details: "Реквизиты сторон",
      bank: "Банк",
      account: "Р/с",
      bic: "БИК",
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
      paymentFor: 'Оплата за помещение {{unit.blockName}} / {{unit.number}}, {{unit.projectName}}',
      dealLine: 'Сделка {{deal.dealNumber}}',
      contractLine:
        ', договор № {{deal.contractNumber}} от {{deal.contractDate}}',
      reference: 'Референс',
      paidToDate: 'Оплачено, включая этот платёж',
      remaining: 'Остаток к оплате',
      receivedFor: 'принял(а) от имени {{company.legalName}}',
      paidBy: 'плательщик',
    },
    schedule: {
      title: 'График платежей',
      annexTo:
        'Приложение к договору № {{deal.contractNumber}} от {{deal.contractDate}}',
      paidBefore: 'Оплачено до составления графика',
      toPay: 'К оплате по графику',
      total: 'Итого',
      termsText:
        'Покупатель вносит указанные выше суммы в указанные сроки. Настоящий график является неотъемлемой частью названного выше договора.',
    },
  },
  ky: {
    taxId: 'ИСН',
    passport: 'Паспорт',
    pin: 'ПИН',
    note: 'Эскертүү',
    project: 'Долбоор',
    sqm: 'м&sup2;',
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
      subject1: "Сатуучу төмөндө көрсөтүлгөн жайды Сатып алуучунун менчигине өткөрүп берүүгө, ал эми Сатып алуучу аны кабыл алып, акысын төлөөгө милдеттенет. Жай «{{unit.projectName}}» объектисинде жайгашкан{{#if project.address}}, дареги: {{project.address}}{{/if}}.",
      entrance: "Кире бериш",
      floor: "Кабат",
      deposit: "Сатып алуучу төлөгөн {{deal.deposit}} өлчөмүндөгү күрөө акы баанын эсебине кошулат.",
      payInFull: "Баа ушул келишимге кол коюлган күндөн тартып 10 (он) банктык күндүн ичинде бир жолу төлөнөт.",
      payBySchedule: "Баа төлөм графигинде — ушул келишимдин ажырагыс бөлүгү болгон тиркемеде белгиленген өлчөмдө жана мөөнөттө төлөнөт.",
      payWhere: "Төлөм 6-бөлүмдө көрсөтүлгөн Сатуучунун эсебине же Сатуучунун кассасына жүргүзүлөт. Төлөм акча түшкөн күнү жүргүзүлдү деп эсептелет.",
      handover: "Жайды өткөрүп берүү",
      handover1: "Сатуучу объект пайдаланууга берилгенден кийин{{#if project.handoverDate}}, {{project.handoverDate}} кечиктирбестен{{/if}}, баа толук төлөнгөн шартта жайды Сатып алуучуга кабыл алуу-өткөрүп берүү акты боюнча өткөрүп берет.",
      handover2: "Менчик укугу Сатып алуучуга мамлекеттик каттоодон өткөн учурдан тартып өтөт.",
      duties: "Тараптардын милдеттери",
      sellerDuties: "Сатуучу жайды долбоордук документтерге ылайык абалда өткөрүп берүүгө жана келишимдин мөөнөтүндө аны үчүнчү жактарга сатпоого жана күрөөгө койбоого милдеттенет.",
      buyerDuties: "Сатып алуучу баасын 2-бөлүмдө белгиленген тартипте төлөөгө жана жайды акт боюнча кабыл алууга милдеттенет.",
      liability: "Жоопкерчилик жана келишимди бузуу",
      liability1: "Төлөмдү жана жайды өткөрүп берүүнү кечиктиргени үчүн тараптар Кыргыз Республикасынын мыйзамдарына ылайык жооп беришет.",
      liability2: "Келишим тараптардын макулдугу менен же мыйзамда каралган учурларда бузулушу мүмкүн.",
      liability3: "Талаштар сүйлөшүү жолу менен, макулдашууга жетишилбесе — Сатуучу жайгашкан жердеги сотто чечилет.",
      details: "Тараптардын реквизиттери",
      bank: "Банк",
      account: "Эсеп",
      bic: "БИК",
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
      paymentFor: '{{unit.blockName}} / {{unit.number}} жай үчүн төлөм, {{unit.projectName}}',
      dealLine: 'Бүтүм {{deal.dealNumber}}',
      contractLine:
        ', келишим № {{deal.contractNumber}}, {{deal.contractDate}}',
      reference: 'Шилтеме',
      paidToDate: 'Ушул төлөмдү кошо алганда төлөндү',
      remaining: 'Калдыгы',
      receivedFor: '{{company.legalName}} атынан кабыл алды',
      paidBy: 'Төлөөчү',
    },
    schedule: {
      title: 'Төлөм графиги',
      annexTo:
        '{{deal.contractDate}} күнкү № {{deal.contractNumber}} келишимге тиркеме',
      paidBefore: 'График түзүлгөнгө чейин төлөндү',
      toPay: 'График боюнча төлөнөт',
      total: 'Бардыгы',
      termsText:
        'Сатып алуучу жогорудагы суммаларды көрсөтүлгөн мөөнөттөрдө төлөйт. Бул график жогоруда аталган келишимдин ажырагыс бөлүгү болуп саналат.',
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
      {{#if company.bankName}}<div>${w.contract.bank}: {{company.bankName}}</div>{{/if}}
      {{#if company.bankAccount}}<div>${w.contract.account}: {{company.bankAccount}}</div>{{/if}}
      {{#if company.bankBic}}<div>${w.contract.bic}: {{company.bankBic}}</div>{{/if}}
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
      <td>{{unit.blockName}} / {{unit.number}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.area}} ${w.sqm}</td>
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

  <h2>1. ${c.subject}</h2>
  <p class="clause">1.1. ${c.subject1}</p>
  <table>
    <tr><th>${w.unit}</th><th>${c.entrance}</th><th>${c.floor}</th><th>${w.type}</th><th>${w.rooms}</th><th>${w.area}</th></tr>
    <tr>
      <td>{{unit.blockName}} / {{unit.number}}</td>
      <td>{{unit.entranceName}}</td>
      <td>{{unit.floorNumber}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.rooms}}</td>
      <td>{{unit.area}} ${w.sqm}</td>
    </tr>
  </table>

  <h2>2. ${c.priceAndPayment}</h2>
  <div class="totals">
    <div class="row"><span>${w.listPrice}</span><span>{{deal.listPrice}}</span></div>
    {{#if deal.discountAmount}}<div class="row"><span>${w.discount} ({{deal.discountPercent}}%)</span><span>-{{deal.discountAmount}}</span></div>{{/if}}
    <div class="row grand"><span>${w.salePrice}</span><span>{{deal.salePrice}}</span></div>
    {{#if deal.financingType}}<div class="row"><span>${c.financing}</span><span>{{deal.financingType}}</span></div>{{/if}}
  </div>
  <p class="clause">2.1. {{#if deal.paysInFull}}${c.payInFull}{{else}}${c.payBySchedule}{{/if}}</p>
  <p class="clause">2.2. ${c.payWhere}</p>
  {{#if deal.deposit}}<p class="clause">2.3. ${c.deposit}</p>{{/if}}

  {{#if schedule.rows}}
  <h2>${c.schedule}</h2>
  <table>
    <tr><th>#</th><th>${c.dueDate}</th><th>${c.amount}</th></tr>
    {{#each schedule.rows}}
    <tr><td>{{order}}</td><td>{{dueDate}}</td><td>{{amount}}</td></tr>
    {{/each}}
  </table>
  {{/if}}

  <h2>3. ${c.handover}</h2>
  <p class="clause">3.1. ${c.handover1}</p>
  <p class="clause">3.2. ${c.handover2}</p>

  <h2>4. ${c.duties}</h2>
  <p class="clause">4.1. ${c.sellerDuties}</p>
  <p class="clause">4.2. ${c.buyerDuties}</p>

  <h2>5. ${c.liability}</h2>
  <p class="clause">5.1. ${c.liability1}</p>
  <p class="clause">5.2. ${c.liability2}</p>
  <p class="clause">5.3. ${c.liability3}</p>

  {{#if deal.note}}<p class="note">${w.note}: {{deal.note}}</p>{{/if}}

  <h2>6. ${c.details}</h2>
  <div class="parties">
    <div class="party">
      <div class="label">${c.seller}</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>${w.taxId}: {{company.taxId}}</div>{{/if}}
      {{#if company.bankName}}<div>${c.bank}: {{company.bankName}}</div>{{/if}}
      {{#if company.bankAccount}}<div>${c.account}: {{company.bankAccount}}</div>{{/if}}
      {{#if company.bankBic}}<div>${c.bic}: {{company.bankBic}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">${c.buyer}</div>
      <div>{{client.fullName}}</div>
      {{#if client.passport}}<div>${w.passport}: {{client.passport}}</div>{{/if}}
      {{#if client.pin}}<div>${w.pin}: {{client.pin}}</div>{{/if}}
      {{#if client.address}}<div>{{client.address}}</div>{{/if}}
      <div>{{client.phone}}</div>
    </div>
  </div>

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

function scheduleTemplate(w: Words): string {
  const c = w.contract;
  const sc = w.schedule;
  return page(`  <h1>${sc.title}</h1>
  <p class="subtitle">${sc.annexTo}</p>

  <div class="parties">
    <div class="party">
      <div class="label">${c.seller}</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>${w.taxId}: {{company.taxId}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">${c.buyer}</div>
      <div>{{client.fullName}}</div>
      <div>{{client.phone}}</div>
      {{#if client.passport}}<div>${w.passport}: {{client.passport}}</div>{{/if}}
      {{#if client.pin}}<div>${w.pin}: {{client.pin}}</div>{{/if}}
    </div>
  </div>

  <p>${w.project}: {{unit.projectName}} &middot; ${w.unit}: {{unit.blockName}} / {{unit.number}} &middot; {{unit.area}} ${w.sqm}</p>

  <div class="totals">
    <div class="row"><span>${w.salePrice}</span><span>{{deal.salePrice}}</span></div>
    {{#if schedule.paidBefore}}<div class="row"><span>${sc.paidBefore}</span><span>{{schedule.paidBefore}}</span></div>{{/if}}
    <div class="row grand"><span>${sc.toPay}</span><span>{{schedule.total}}</span></div>
  </div>

  <h2>${sc.title}</h2>
  <table>
    <tr><th>#</th><th>${c.dueDate}</th><th style="text-align:right">${c.amount}</th></tr>
    {{#each schedule.rows}}
    <tr><td>{{order}}</td><td>{{dueDate}}</td><td style="text-align:right">{{amount}}</td></tr>
    {{/each}}
    <tr><td></td><td><strong>${sc.total}</strong></td><td style="text-align:right"><strong>{{schedule.total}}</strong></td></tr>
  </table>

  <p>${sc.termsText}</p>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">${signatory} — ${c.forSeller}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — ${c.asBuyer}</div>
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
    [DocumentType.PAYMENT_SCHEDULE]: scheduleTemplate(w),
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
