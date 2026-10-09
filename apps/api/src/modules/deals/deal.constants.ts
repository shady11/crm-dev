import {DealStatus, Prisma, ProjectStatus} from "@/generated/prisma/client";

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
        orderBy: { paidAt: 'desc' },
    },

    paymentSchedules: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
    },

    activities: {
        orderBy: { createdAt: 'desc' },
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