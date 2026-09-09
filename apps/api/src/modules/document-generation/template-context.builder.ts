import { Company, Prisma } from '@/generated/prisma/client';
import { DEAL_DETAILS_INCLUDE } from '@/modules/deals/deal.constants';

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
  };
  today: string;
}

function money(
  value: Prisma.Decimal | number | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined) return '';
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return currency ? `${amount} ${currency}` : amount;
}

function date(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function buildTemplateContext(
  deal: DealWithDetails,
  company: Company,
): TemplateContext {
  const currency = company.currency ?? undefined;

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
      financingType: deal.financingType ?? '',
      listPrice: money(deal.listPrice, currency),
      salePrice: money(deal.salePrice, currency),
      discountAmount: deal.discountAmount
        ? money(deal.discountAmount, currency)
        : '',
      discountPercent: deal.discountPercent
        ? deal.discountPercent.toString()
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
      type: deal.unit.type,
      rooms: deal.unit.rooms != null ? String(deal.unit.rooms) : '',
      area: deal.unit.area.toString(),
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
    schedule: {
      rows: deal.paymentSchedules.map((schedule) => ({
        order: schedule.order,
        dueDate: date(schedule.dueDate),
        amount: money(schedule.amount, currency),
      })),
    },
    today: date(new Date()),
  };
}
