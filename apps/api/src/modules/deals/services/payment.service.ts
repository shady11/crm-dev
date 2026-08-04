import {ForbiddenException, Injectable} from '@nestjs/common';
import {DealStatus, PaymentScheduleStatus, Prisma} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';
import {DealDomainService} from './deal-domain.service';
import {DealActivityService} from './deal-activity.service';
import {DealsService} from './deals.service';
import {DealMapper} from '../mappers/deal.mapper';
import {DEAL_DETAILS_INCLUDE} from '../deal.constants';
import {DealNotFoundException} from '../exceptions';
import {CreatePaymentDto} from '../dto/create-payment.dto';

@Injectable()
export class PaymentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mapper: DealMapper,
        private readonly domain: DealDomainService,
        private readonly activityService: DealActivityService,
        private readonly dealsService: DealsService,
    ) {}

    async create(user: AuthUser, dealId: string, dto: CreatePaymentDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const result = await this.prisma.$transaction(async db => {
            const deal = await db.deal.findFirst({ where: { id: dealId, companyId } });
            if (!deal) throw new DealNotFoundException(dealId);

            this.domain.ensureStatus(deal, DealStatus.ACTIVE);

            const paidAgg = await db.payment.aggregate({
                where: { dealId, deletedAt: null },
                _sum: { amount: true },
            });
            const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
            const amount = new Prisma.Decimal(dto.amount);

            this.domain.ensurePaymentWithinBalance(deal, totalPaid, amount);

            await db.payment.create({
                data: {
                    dealId,
                    userId: user.id,
                    amount,
                    paymentMethod: dto.paymentMethod,
                    paymentType: dto.paymentType,
                    paidAt: new Date(dto.paidAt),
                    reference: dto.reference,
                    note: dto.note,
                },
            });

            // Apply this payment against outstanding schedule installments, in order
            let remainingToApply = amount;

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

            await this.activityService.paymentReceived({
                db, companyId, userId: user.id,
                dealId, clientId: deal.clientId,
                metadata: {
                    amount: amount.toNumber(),
                    paymentMethod: dto.paymentMethod,
                    paymentType: dto.paymentType,
                },
            });

            await this.dealsService.tryCompleteWithinTransaction(db, companyId, user.id, dealId);

            return db.deal.findUniqueOrThrow({ where: { id: dealId }, include: DEAL_DETAILS_INCLUDE });
        });

        return this.mapper.toDetails(result);
    }
}