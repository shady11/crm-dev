import {Prisma} from '@/generated/prisma/client';

export type DealListItem = Prisma.DealGetPayload<{
    include: {
        client: true;
        manager: true;
        project: true;
        unit: {
            include: {
                block: true;
                entrance: true;
                floor: true;
            };
        };
    };
}>;

export type DealDetails = Prisma.DealGetPayload<{
    include: {
        client: true;
        manager: true;
        project: true;

        unit: {
            include: {
                block: true;
                entrance: true;
                floor: true;
            };
        };

        payments: {
            orderBy: {
                paidAt: 'desc';
            };
        };

        paymentSchedules: {
            orderBy: {
                order: 'asc';
            };
        };

        activities: {
            orderBy: {
                createdAt: 'desc';
            };
        };

        tasks: true;
    };
}>;