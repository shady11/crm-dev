import {BadRequestException, ForbiddenException, Injectable, Logger} from '@nestjs/common';
import {ActivityAction, ActivityType, DealStatus, DocumentType, PaymentScheduleStatus, Prisma} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {AuthUser} from '@/common/types/auth-user.type';
import {DealDomainService} from '../deal-domain.service';
import {DealActivityService} from '../deal-activity.service';
import {DealNotFoundException, PaymentScheduleAlreadyGeneratedException} from '../../exceptions';
import {GeneratePaymentScheduleDto} from '../../dto/payments/generate-payment-schedule.dto';
import {DealMapper} from "@/modules/deals/mappers/deal.mapper";
import {DEAL_DETAILS_INCLUDE} from "../../deal.constants";
import { activityText } from '@/modules/activities/activity-templates';
import {ScheduleNeededNotifier} from '../schedule-needed-notifier.service';
import {DocumentGenerationService} from '@/modules/document-generation/document-generation.service';
import {startOfToday} from './overdue-installments';

@Injectable()
export class PaymentScheduleService {
    private readonly logger = new Logger(PaymentScheduleService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mapper: DealMapper,
        private readonly domain: DealDomainService,
        private readonly activityService: DealActivityService,
        private readonly scheduleNeeded: ScheduleNeededNotifier,
        private readonly documentGeneration: DocumentGenerationService,
    ) {}

    async generate(user: AuthUser, dealId: string, dto: GeneratePaymentScheduleDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const companyId = user.companyId;

        const result = await this.prisma.$transaction(async db => {
            const deal = await db.deal.findFirst({
                where: {
                    id: dealId,
                    companyId,
                    ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
                },
            });
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
            const today = startOfToday();

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
                    // A schedule entered with past dates (an existing
                    // contract brought into the CRM) is overdue at once,
                    // not from the next reminder run.
                    status: dueDate < today ? PaymentScheduleStatus.OVERDUE : PaymentScheduleStatus.PENDING,
                    order: i + 1,
                });
            }

            await db.paymentSchedule.createMany({ data: rows });

            await this.activityService.create({
                db, companyId, userId: user.id,
                dealId,
                action: ActivityAction.UPDATED_DEAL,
                type: ActivityType.DEAL_UPDATED,
                ...activityText('paymentScheduleGeneratedTerms', {
                    installments,
                    firstDate: firstDate.toISOString().slice(0, 10),
                }),
            });

            return db.deal.findUniqueOrThrow({ where: { id: dealId }, include: DEAL_DETAILS_INCLUDE });
        });

        await this.scheduleNeeded.resolveScheduled(result, user.name);
        await this.generateAnnex(user, result);

        return this.mapper.toDetails(result);
    }

    /**
     * E2E-5: the schedule is made after the contract is signed, so the client
     * gets it as an annex to the contract. Best-effort, like the contract at
     * signing: the schedule already exists, and the annex can be generated
     * again from the deal.
     */
    private async generateAnnex(user: AuthUser, deal: { id: string; companyId: string; clientId: string }) {
        try {
            const document = await this.documentGeneration.generateForDeal({
                companyId: deal.companyId,
                dealId: deal.id,
                type: DocumentType.PAYMENT_SCHEDULE,
                userId: user.id,
            });
            await this.activityService.documentGenerated(
                {
                    db: this.prisma,
                    companyId: deal.companyId,
                    userId: user.id,
                    dealId: deal.id,
                    clientId: deal.clientId,
                    metadata: {documentId: document.id, documentType: DocumentType.PAYMENT_SCHEDULE},
                },
                activityText('paymentScheduleAnnexGenerated'),
            );
        } catch (error) {
            this.logger.error(
                `Failed to generate the payment schedule annex for deal ${deal.id}`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }
}