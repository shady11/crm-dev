import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuthUser } from '@/common/types/auth-user.type';
import { DocumentGenerationService } from '@/modules/document-generation/document-generation.service';
import { DealActivityService } from '../deal-activity.service';
import { DealNotFoundException } from '../../exceptions';
import { activityText } from '@/modules/activities/activity-templates';

/**
 * FIN-8: the receipt for one incoming payment. Generated the first time it's
 * asked for and reused after that, so a receipt number always prints the
 * same file; if that file was deleted, a fresh one is generated.
 */
@Injectable()
export class PaymentReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentGeneration: DocumentGenerationService,
    private readonly activityService: DealActivityService,
  ) {}

  async getOrCreate(user: AuthUser, dealId: string, paymentId: string) {
    if (!user.companyId)
      throw new ForbiddenException('User does not belong to a company');
    const companyId = user.companyId;

    const deal = await this.prisma.deal.findFirst({
      where: {
        id: dealId,
        companyId,
        ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
      },
      select: { id: true, clientId: true },
    });
    if (!deal) throw new DealNotFoundException(dealId);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, dealId },
      select: {
        id: true,
        receiptNumber: true,
        receiptDocument: true,
        deletedAt: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    // Voided (FIN-3): the number stays taken, but the receipt doesn't stand.
    if (payment.deletedAt) {
      throw new BadRequestException(
        'This payment was voided, so its receipt no longer stands.',
      );
    }
    if (!payment.receiptNumber) {
      throw new BadRequestException(
        "This payment has no receipt: refunds aren't receipts.",
      );
    }

    if (payment.receiptDocument && !payment.receiptDocument.deletedAt) {
      return payment.receiptDocument;
    }

    const document = await this.documentGeneration.generateReceipt({
      companyId,
      dealId,
      paymentId,
      userId: user.id,
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptDocumentId: document.id },
    });

    await this.activityService.documentGenerated(
      {
        db: this.prisma,
        companyId,
        userId: user.id,
        dealId,
        clientId: deal.clientId,
        metadata: {
          documentId: document.id,
          documentType: document.type,
          paymentId,
        },
      },
      activityText('receiptIssued', { receipt: payment.receiptNumber }),
    );

    return document;
  }
}
