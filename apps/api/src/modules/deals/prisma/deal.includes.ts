import {Prisma} from '@/generated/prisma/client';

export const dealListInclude = {
    client: true,
    manager: true,
    project: true,

    unit: {
        include: {
            block: true,
            entrance: true,
            floor: true,
        },
    },
} satisfies Prisma.DealInclude;

export const dealDetailsInclude = {
    client: true,
    manager: true,
    project: true,

    unit: {
        include: {
            block: true,
            entrance: true,
            floor: true,
        },
    },

    payments: {
        orderBy: {
            paidAt: 'desc',
        },
    },

    paymentSchedules: {
        orderBy: {
            order: 'asc',
        },
    },

    activities: {
        orderBy: {
            createdAt: 'desc',
        },
    },

    tasks: true,
} satisfies Prisma.DealInclude;