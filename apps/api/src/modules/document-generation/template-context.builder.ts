import { Company, Prisma } from '@/generated/prisma/client';
import { DEAL_DETAILS_INCLUDE } from '@/modules/deals/deal.constants';
import { documentFormatter, documentLanguage } from './document-language';

type DealWithDetails = Prisma.DealGetPayload<{
  include: typeof DEAL_DETAILS_INCLUDE;
}>;

/**
 * The token vocabulary a DocumentTemplate's bodyHtml can reference (see
 * default-templates.ts for the full set in use). Values are pre-formatted
 * strings, not raw Decimal/Date objects — templates stay plain
 * {{company.legalName}}-style placeholders with no Handlebars helpers to
 * teach a non-engineer template author.
 */
export interface TemplateContext {
  company: {
    name: string;
    legalName: string;
    address: string;
    phone: string;
    taxId: string;
    signatoryName: string;
    signatoryTitle: string;
    currency: string;
  };
  deal: {
    dealNumber: string;
    status: string;
    financingType: string;
    listPrice: string;
    salePrice: string;
    discountAmount: string;
    discountPercent: string;
    deposit: string;
    reservedAt: string;
    reservationExpiresAt: string;
    contractNumber: string;
    contractDate: string;
    note: string;
  };
  client: {
    fullName: string;
    phone: string;
    email: string;
    passport: string;
    pin: string;
    address: string;
  };
  unit: {
    number: string;
    type: string;
    rooms: string;
    area: string;
    projectName: string;
    blockName: string;
    entranceName: string;
    floorNumber: string;
  };
  manager: {
    fullName: string;
    phone: string;
    email: string;
  };
  schedule: {
    rows: Array<{ order: number; dueDate: string; amount: string }>;
    /** E2E-5: what the schedule asks for in all, and what was paid before it. */
    total: string;
    paidBefore: string;
  };
  today: string;
}

export function buildTemplateContext(
  deal: DealWithDetails,
  company: Company,
): TemplateContext {
  const currency = company.currency ?? undefined;
  // E2E-3: values print in the company's document language.
  const f = documentFormatter(documentLanguage(company.locale));
  const money = f.money;
  const date = f.date;

  return {
    company: {
      name: company.name,
      legalName: company.legalName ?? company.name,
      address: company.address ?? '',
      phone: company.phone ?? '',
      taxId: company.taxId ?? '',
      signatoryName: company.signatoryName ?? '',
      signatoryTitle: company.signatoryTitle ?? '',
      currency: currency ?? '',
    },
    deal: {
      dealNumber: deal.dealNumber,
      status: deal.status,
      financingType: f.financing(deal.financingType),
      listPrice: money(deal.listPrice, currency),
      salePrice: money(deal.salePrice, currency),
      // A Decimal zero is still an object, so test the number: no discount
      // leaves the line out instead of printing "-0.00".
      discountAmount:
        Number(deal.discountAmount ?? 0) > 0
          ? money(deal.discountAmount, currency)
          : '',
      discountPercent:
        Number(deal.discountPercent ?? 0) > 0
          ? f.number(deal.discountPercent)
          : '',
      deposit: deal.deposit ? money(deal.deposit, currency) : '',
      reservedAt: date(deal.reservedAt),
      reservationExpiresAt: date(deal.reservationExpiresAt),
      contractNumber: deal.contractNumber ?? '',
      contractDate: date(deal.contractDate),
      note: deal.note ?? '',
    },
    client: {
      fullName: deal.client.fullName,
      phone: deal.client.phone,
      email: deal.client.email ?? '',
      passport: deal.client.passport ?? '',
      pin: deal.client.pin ?? '',
      address: deal.client.address ?? '',
    },
    unit: {
      number: deal.unit.number,
      type: f.unitType(deal.unit.type),
      rooms: deal.unit.rooms != null ? String(deal.unit.rooms) : '',
      area: f.number(deal.unit.area),
      projectName: deal.project.name,
      blockName: deal.unit.block.name,
      entranceName: deal.unit.entrance.name,
      floorNumber: String(deal.unit.floor.number),
    },
    manager: {
      fullName: deal.manager?.fullName ?? '',
      phone: deal.manager?.phone ?? '',
      email: deal.manager?.email ?? '',
    },
    schedule: scheduleContext(deal, f, currency),
    today: date(new Date()),
  };
}

/**
 * The schedule splits what was owed when it was made, so the sale price
 * less its total is what had been paid by then. That stays true when the
 * document is printed again after later payments.
 */
function scheduleContext(
  deal: DealWithDetails,
  f: ReturnType<typeof documentFormatter>,
  currency: string | undefined,
): TemplateContext['schedule'] {
  const rows = deal.paymentSchedules;
  if (rows.length === 0) return { rows: [], total: '', paidBefore: '' };
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const paidBefore = Number(deal.salePrice) - total;
  return {
    rows: rows.map((row) => ({
      order: row.order,
      dueDate: f.date(row.dueDate),
      amount: f.money(row.amount, currency),
    })),
    total: f.money(total, currency),
    paidBefore: paidBefore >= 0.01 ? f.money(paidBefore, currency) : '',
  };
}

type ReceiptPayment = Prisma.PaymentGetPayload<{
  include: { user: { select: { fullName: true } } };
}>;

/**
 * FIN-8: everything a PAYMENT_RECEIPT template can print - the deal's usual
 * context, the payment itself, and where the deal stands after it.
 */
export interface ReceiptTemplateContext extends TemplateContext {
  payment: {
    receiptNumber: string;
    date: string;
    amount: string;
    method: string;
    type: string;
    reference: string;
    note: string;
    receivedBy: string;
  };
  totals: {
    paidToDate: string;
    remaining: string;
  };
}

export function buildReceiptContext(
  deal: DealWithDetails,
  company: Company,
  payment: ReceiptPayment,
): ReceiptTemplateContext {
  const base = buildTemplateContext(deal, company);
  const currency = company.currency ?? undefined;
  const f = documentFormatter(documentLanguage(company.locale));

  // Paid up to and including this payment, net of refunds before it, so a
  // receipt reprinted later still shows the balance as it was that day.
  // E2E-2: by calendar day, then by when each was recorded: a deposit taken
  // at reservation used to carry its time of day while form payments sit at
  // midnight, so a same-day deposit sorted after them and was left out.
  const day = (value: Date) => value.toISOString().slice(0, 10);
  const paidToDate = deal.payments
    .filter(
      (p) =>
        day(p.paidAt) < day(payment.paidAt) ||
        (day(p.paidAt) === day(payment.paidAt) &&
          p.createdAt <= payment.createdAt),
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    ...base,
    payment: {
      receiptNumber: payment.receiptNumber ?? '',
      date: f.date(payment.paidAt),
      amount: f.money(payment.amount, currency),
      method: f.paymentMethod(payment.paymentMethod),
      type: f.paymentType(payment.paymentType),
      reference: payment.reference ?? '',
      note: payment.note ?? '',
      receivedBy: payment.user?.fullName ?? '',
    },
    totals: {
      paidToDate: f.money(paidToDate, currency),
      remaining: f.money(
        Math.max(Number(deal.salePrice) - paidToDate, 0),
        currency,
      ),
    },
  };
}
