import {DealStatus, DiscountApprovalStatus, PaymentScheduleStatus, Prisma, ProjectStatus} from "@/generated/prisma/client";

// Project statuses in which units may be booked: off-plan pre-sales while
// PLANNING, normal sales while ACTIVE, and remaining stock once COMPLETED.
// DRAFT, PAUSED, SOLDOUT and ARCHIVED projects are closed for sales.
export const BOOKABLE_PROJECT_STATUSES: ProjectStatus[] = [
    ProjectStatus.PLANNING,
    ProjectStatus.ACTIVE,
    ProjectStatus.COMPLETED,
];

export const ACTIVE_DEAL_STATUSES: DealStatus[]  = [
    'RESERVED',
    'CONTRACT_SIGNED',
    'ACTIVE',
];

// The dashboard's "Needs attention" queues, shared with the deals list's
// attention filter so "View all" opens exactly the deals the dashboard
// counted. A discount is only requested at reservation and signing waits
// on the decision, so a pending request always sits on a reservation; an
// installment counts once the reminder cron has flipped it to OVERDUE,
// and only while the deal is still in progress.
export const OVERDUE_INSTALLMENT_WHERE: Prisma.PaymentScheduleWhereInput = {
    deletedAt: null,
    status: PaymentScheduleStatus.OVERDUE,
};

export function dealAttentionWhere(filter: "discount_pending" | "overdue_payments"): Prisma.DealWhereInput {
    if (filter === "discount_pending") {
        return { deletedAt: null, status: DealStatus.RESERVED, discountApprovalStatus: DiscountApprovalStatus.PENDING };
    }

    return {
        deletedAt: null,
        status: { in: ACTIVE_DEAL_STATUSES },
        paymentSchedules: { some: OVERDUE_INSTALLMENT_WHERE },
    };
}

// How a deal's status reads in a notification title ("Deal D-2026-0001:
// contract signed"), rather than the raw enum value.
export const DEAL_STATUS_PHRASES: Record<DealStatus, string> = {
    RESERVED: 'reserved',
    CONTRACT_SIGNED: 'contract signed',
    ACTIVE: 'activated, payments under way',
    COMPLETED: 'completed, fully paid',
    CANCELLED: 'cancelled',
    EXPIRED: 'reservation expired',
};

/** "Deal D-2026-0001: contract signed" */
export function dealStatusTitle(dealNumber: string, status: DealStatus): string {
    return `Deal ${dealNumber}: ${DEAL_STATUS_PHRASES[status]}`;
}

/** "3,693.33 KGS": the amount in the company's own currency. */
export function formatMoney(amount: Prisma.Decimal | number, currency: string | null | undefined): string {
    const value = Number(amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    return currency ? `${value} ${currency}` : value;
}

// A deal is won once the contract is signed. COMPLETED only means the last
// installment came in, which on an installment plan can be years later, so
// counting only COMPLETED would show a manager almost no wins.
export const WON_DEAL_STATUSES: DealStatus[] = [
    'CONTRACT_SIGNED',
    'ACTIVE',
    'COMPLETED',
];

export const RESERVATION_POLICY_SELECT = {
    reservationDefaultDays: true,
    reservationMaxDays: true,
    reservationMaxExtensions: true,
} satisfies Prisma.CompanySelect;

export const DEAL_MANAGER_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
} satisfies Prisma.UserSelect;

export const DEAL_DETAILS_INCLUDE = {
    client: true,
    manager: { select: DEAL_MANAGER_SELECT },
    project: true,

    unit: {
        include: { block: true, entrance: true, floor: true },
    },

    payments: {
        where: { deletedAt: null },
        // Newest first; same-day payments by when they were recorded.
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        // Who recorded it, for the deal's payment list (FIN-10).
        include: { user: { select: { id: true, fullName: true } } },
    },

    paymentSchedules: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
    },

    activities: {
        orderBy: { createdAt: 'desc' },
        // SA-2: done by a platform admin while viewing as the user.
        include: { impersonatedBy: { select: { id: true, fullName: true } } },
    },

    tasks: true,
} satisfies Prisma.DealInclude;

export const DEAL_LIST_INCLUDE = {
    client: true,
    manager: { select: DEAL_MANAGER_SELECT },
    project: true,
    unit: {
        include: { block: true, entrance: true, floor: true },
    },
} satisfies Prisma.DealInclude;