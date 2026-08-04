import {DealStatus, Prisma} from "@/generated/prisma/client";

export const ACTIVE_DEAL_STATUSES: DealStatus[]  = [
    'RESERVED',
    'CONTRACT_SIGNED',
    'ACTIVE',
];

export const DEAL_DETAILS_INCLUDE = {
    client: true,
    manager: true,
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