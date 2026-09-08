import {Injectable} from '@nestjs/common';
import {ActivityAction, ActivityType, Prisma} from '@/generated/prisma/client';
import {DbClient} from '@/database/prisma.types';

interface CreateActivityParams {
    db: DbClient;
    companyId: string;
    userId: string;

    dealId?: string;
    clientId?: string;
    leadId?: string;

    action: ActivityAction;
    type: ActivityType;

    title: string;
    description?: string;

    metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class DealActivityService {
    async create(params: CreateActivityParams) {
        const {
            db,
            companyId,
            userId,
            dealId,
            clientId,
            leadId,
            action,
            type,
            title,
            description,
            metadata,
        } = params;

        return db.activity.create({
            data: {
                companyId,
                userId,

                dealId,
                clientId,
                leadId,

                action,
                type,

                title,
                description,

                metadata,
            },
        });
    }

    reserve(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RESERVED_UNIT,
            type: ActivityType.UNIT_RESERVED,
            title: 'Unit reserved',
        });
    }

    extendReservation(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.UPDATED,
            type: ActivityType.RESERVATION_EXTENDED,
            title: 'Reservation extended',
        });
    }

    cancelReservation(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.CANCELLED_RESERVATION,
            type: ActivityType.RESERVATION_CANCELLED,
            title: 'Reservation cancelled',
        });
    }

    expireReservation(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.CHANGED_DEAL_STATUS,
            type: ActivityType.RESERVATION_EXPIRED,
            title: 'Reservation expired',
        });
    }

    signContract(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.GENERATED_CONTRACT,
            type: ActivityType.CONTRACT_SIGNED,
            title: 'Contract signed',
        });
    }

    paymentReceived(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RECEIVED_PAYMENT,
            type: ActivityType.PAYMENT_RECEIVED,
            title: 'Payment received',
        });
    }

    paymentRefunded(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RECEIVED_PAYMENT,
            type: ActivityType.PAYMENT_REFUNDED,
            title: 'Refund issued',
        });
    }

    dealUpdated(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.UPDATED_DEAL,
            type: ActivityType.DEAL_UPDATED,
            title: 'Deal updated',
        });
    }

    reassignManager(
        params: Omit<CreateActivityParams, 'action' | 'type' | 'title'>,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.REASSIGNED,
            type: ActivityType.DEAL_REASSIGNED,
            title: 'Deal reassigned to another manager',
        });
    }
}