import {BadRequestException, ForbiddenException, Injectable} from '@nestjs/common';
import {ActivityAction, ActivityType, DealStatus, PaymentScheduleStatus, Prisma} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';
import {DealDomainService} from './deal-domain.service';
import {DealActivityService} from './deal-activity.service';
import {DealNotFoundException, PaymentScheduleAlreadyGeneratedException} from '../exceptions';
import {GeneratePaymentScheduleDto} from '../dto/generate-payment-schedule.dto';
import {DealMapper} from "@/modules/deals/mappers/deal.mapper";
import {DEAL_DETAILS_INCLUDE} from "../deal.constants";

@Injectable()
export class PaymentScheduleService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mapper: DealMapper,
        private readonly domain: DealDomainService,
        private readonly activityService: DealActivityService,
    ) {}

    async generate(user: AuthUser, dealId: string, dto: GeneratePaymentScheduleDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const result = await this.prisma.$transaction(async db => {
            const deal = await db.deal.findFirst({ where: { id: dealId, companyId } });
            if (!deal) throw new DealNotFoundException(dealId);

            this.domain.ensureStatus(deal, DealStatus.ACTIVE);

            const existing = await db.paymentSchedule.findFirst({
                where: { dealId, deletedAt: null },
            });
            if (existing) throw new PaymentScheduleAlreadyGeneratedException();

            const paidAgg = await db.payment.aggregate({
                where: { dealId, deletedAt: null },
                _sum: { amount: true },
            });
            const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
            const remaining = deal.salePrice.minus(totalPaid);

            if (remaining.lessThanOrEqualTo(0)) {
                throw new BadRequestException("Deal is already fully paid; no schedule needed.");
            }

            const installments = dto.installments;
            const intervalMonths = dto.intervalMonths ?? 1;
            const firstDate = new Date(dto.firstPaymentDate);

            const baseAmount = new Prisma.Decimal(
                Math.floor((remaining.toNumber() / installments) * 100) / 100,
            );

            const rows: Prisma.PaymentScheduleCreateManyInput[] = [];
            let allocated = new Prisma.Decimal(0);

            for (let i = 0; i < installments; i++) {
                const isLast = i === installments - 1;
                const amount = isLast ? remaining.minus(allocated) : baseAmount;
                allocated = allocated.plus(amount);

                const dueDate = new Date(firstDate);
                dueDate.setMonth(dueDate.getMonth() + i * intervalMonths);

                rows.push({
                    dealId,
                    dueDate,
                    amount,
                    paidAmount: 0,
                    status: PaymentScheduleStatus.PENDING,
                    order: i + 1,
                });
            }

            await db.paymentSchedule.createMany({ data: rows });

            await this.activityService.create({
                db, companyId, userId: user.id,
                dealId,
                action: ActivityAction.UPDATED_DEAL,
                type: ActivityType.DEAL_UPDATED,
                title: 'Payment schedule generated',
                description: `${installments} installments starting ${firstDate.toLocaleDateString()}`,
            });

            return db.deal.findUniqueOrThrow({ where: { id: dealId }, include: DEAL_DETAILS_INCLUDE });
        });

        return this.mapper.toDetails(result);
    }
}