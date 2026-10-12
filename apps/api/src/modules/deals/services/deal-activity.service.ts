import {Injectable} from '@nestjs/common';
import {ActivityAction, ActivityType, Prisma} from '@/generated/prisma/client';
import {DbClient} from '@/database/prisma.types';
import {activityText} from '@/modules/activities/activity-templates';

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
    templateKey?: string;
    templateParams?: Prisma.InputJsonValue;
    description?: string;

    metadata?: Prisma.InputJsonValue;
}

type EventParams = Omit<
    CreateActivityParams,
    'action' | 'type' | 'title' | 'templateKey' | 'templateParams'
>;

/** A title from activityText(), e.g. activityText('receiptIssued', {...}). */
export type ActivityTitle = ReturnType<typeof activityText>;

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
            templateKey,
            templateParams,
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
                templateKey,
                templateParams,
                description,

                metadata,
            },
        });
    }

    reserve(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RESERVED_UNIT,
            type: ActivityType.UNIT_RESERVED,
            ...activityText('unitReserved'),
        });
    }

    extendReservation(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.UPDATED,
            type: ActivityType.RESERVATION_EXTENDED,
            ...activityText('reservationExtended'),
        });
    }

    cancelReservation(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.CANCELLED_RESERVATION,
            type: ActivityType.RESERVATION_CANCELLED,
            ...activityText('reservationCancelled'),
        });
    }

    expireReservation(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.CHANGED_DEAL_STATUS,
            type: ActivityType.RESERVATION_EXPIRED,
            ...activityText('reservationExpired'),
        });
    }

    signContract(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.GENERATED_CONTRACT,
            type: ActivityType.CONTRACT_SIGNED,
            ...activityText('contractSigned'),
        });
    }

    paymentReceived(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RECEIVED_PAYMENT,
            type: ActivityType.PAYMENT_RECEIVED,
            ...activityText('paymentReceived'),
        });
    }

    paymentRefunded(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.RECEIVED_PAYMENT,
            type: ActivityType.PAYMENT_REFUNDED,
            ...activityText('refundIssued'),
        });
    }

    dealUpdated(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.UPDATED_DEAL,
            type: ActivityType.DEAL_UPDATED,
            ...activityText('dealUpdated'),
        });
    }

    reassignManager(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.REASSIGNED,
            type: ActivityType.DEAL_REASSIGNED,
            ...activityText('dealReassigned'),
        });
    }

    documentGenerated(
        params: EventParams,
        text: ActivityTitle,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.GENERATED_DOCUMENT,
            type: ActivityType.DOCUMENT_GENERATED,
            ...text,
        });
    }

    discountRequested(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.DISCOUNT_REQUESTED,
            type: ActivityType.DISCOUNT_REQUESTED,
            ...activityText('discountRequested'),
        });
    }

    discountApproved(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.DISCOUNT_APPROVED,
            type: ActivityType.DISCOUNT_APPROVED,
            ...activityText('discountApproved'),
        });
    }

    discountRejected(
        params: EventParams,
    ) {
        return this.create({
            ...params,
            action: ActivityAction.DISCOUNT_REJECTED,
            type: ActivityType.DISCOUNT_REJECTED,
            ...activityText('discountRejected'),
        });
    }
}