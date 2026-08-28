import {ForbiddenException, Injectable} from '@nestjs/common';
import {
    DealStatus,
    NotificationEntityType,
    NotificationType,
    PaymentScheduleStatus,
    PaymentType,
    Prisma
} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';
import {DealDomainService} from '../deal-domain.service';
import {DealActivityService} from '../deal-activity.service';
import {DealsService} from '../deals.service';
import {DealMapper} from '../../mappers/deal.mapper';
import {DEAL_DETAILS_INCLUDE} from '../../deal.constants';
import {DealNotFoundException} from '../../exceptions';
import {CreatePaymentDto} from '../../dto/payments/create-payment.dto';
import {NotificationsService} from "@/modules/notifications/notifications.service";

@Injectable()
export class PaymentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mapper: DealMapper,
        private readonly domain: DealDomainService,
        private readonly activityService: DealActivityService,
        private readonly dealsService: DealsService,
        private readonly notifications: NotificationsService,
    ) {}

    async create(user: AuthUser, dealId: string, dto: CreatePaymentDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;
        const isRefund = dto.paymentType === PaymentType.REFUND;

        const result = await this.prisma.$transaction(async db => {
            const deal = await db.deal.findFirst({ where: { id: dealId, companyId } });
            if (!deal) throw new DealNotFoundException(dealId);

            this.domain.ensureStatus(deal, DealStatus.ACTIVE);

            const paidAgg = await db.payment.aggregate({
                where: { dealId, deletedAt: null },
                _sum: { amount: true },
            });
            const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);

            // dto.amount is always a positive magnitude from the client; refunds are
            // negated here so the stored amount is signed and SUM(payments.amount)
            // is always the correct net figure with no special-casing downstream.
            const magnitude = new Prisma.Decimal(dto.amount);
            const signedAmount = isRefund ? magnitude.negated() : magnitude;

            this.domain.ensurePaymentWithinBalance(deal, totalPaid, signedAmount);

            await db.payment.create({
                data: {
                    dealId,
                    userId: user.id,
                    amount: signedAmount,
                    paymentMethod: dto.paymentMethod,
                    paymentType: dto.paymentType,
                    paidAt: new Date(dto.paidAt),
                    reference: dto.reference,
                    note: dto.note,
                },
            });

            if (deal.managerId) {
                await this.notifications.create({
                    companyId,
                    userId: deal.managerId,
                    type: NotificationType.PAYMENT_RECEIVED,
                    title: isRefund
                        ? `Refund issued for deal ${deal.dealNumber}`
                        : `Payment received for deal ${deal.dealNumber}`,
                    message: `${magnitude.toString()} $`,
                    entityType: NotificationEntityType.DEAL,
                    entityId: dealId,
                });
            }

            // Apply forward payments against outstanding schedule installments, in
            // order. Refunds are NOT applied here — reopening specific installments
            // against a refund is a product-policy question (see US-D6), not something
            // to infer silently. A refund still affects totalPaid/balance via the
            // signed amount above; it just doesn't rewrite schedule rows.
            if (!isRefund) {
                let remainingToApply = signedAmount;

                const schedules = await db.paymentSchedule.findMany({
                    where: {
                        dealId,
                        deletedAt: null,
                        status: { in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL, PaymentScheduleStatus.OVERDUE] },
                    },
                    orderBy: { order: 'asc' },
                });

                for (const schedule of schedules) {
                    if (remainingToApply.lessThanOrEqualTo(0)) break;

                    const due = schedule.amount.minus(schedule.paidAmount);
                    const applied = Prisma.Decimal.min(due, remainingToApply);
                    const newPaidAmount = schedule.paidAmount.plus(applied);

                    await db.paymentSchedule.update({
                        where: { id: schedule.id },
                        data: {
                            paidAmount: newPaidAmount,
                            status: newPaidAmount.greaterThanOrEqualTo(schedule.amount)
                                ? PaymentScheduleStatus.PAID
                                : PaymentScheduleStatus.PARTIAL,
                        },
                    });

                    remainingToApply = remainingToApply.minus(applied);
                }
            }

            if (isRefund) {
                await this.activityService.paymentRefunded({
                    db, companyId, userId: user.id,
                    dealId, clientId: deal.clientId,
                    metadata: {
                        amount: magnitude.toNumber(),
                        paymentMethod: dto.paymentMethod,
                    },
                });
            } else {
                await this.activityService.paymentReceived({
                    db, companyId, userId: user.id,
                    dealId, clientId: deal.clientId,
                    metadata: {
                        amount: magnitude.toNumber(),
                        paymentMethod: dto.paymentMethod,
                        paymentType: dto.paymentType,
                    },
                });

                // Only a forward payment can push a deal to completion — a refund
                // reduces totalPaid, so it can never satisfy ensureCanComplete.
                await this.dealsService.tryCompleteWithinTransaction(db, companyId, user.id, dealId);
            }

            return db.deal.findUniqueOrThrow({ where: { id: dealId }, include: DEAL_DETAILS_INCLUDE });
        });

        return this.mapper.toDetails(result);
    }
}