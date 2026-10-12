import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentReceiptService } from './payment-receipt.service';
import { DealNotFoundException } from '../../exceptions';

describe('PaymentReceiptService.getOrCreate', () => {
  const finance = {
    id: 'finance-1',
    companyId: 'company-1',
    isBranchScoped: false,
    branchId: null,
  } as any;
  const head = {
    id: 'head-1',
    companyId: 'company-1',
    isBranchScoped: true,
    branchId: 'branch-1',
  } as any;

  function build(opts: { deal?: unknown; payment?: unknown } = {}) {
    const prisma = {
      deal: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opts.deal === undefined
              ? { id: 'deal-1', clientId: 'client-1' }
              : opts.deal,
          ),
      },
      payment: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opts.payment === undefined
              ? {
                  id: 'pay-1',
                  receiptNumber: 'R-2026-0007',
                  receiptDocument: null,
                }
              : opts.payment,
          ),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const generated = {
      id: 'doc-new',
      type: 'PAYMENT_RECEIPT',
      deletedAt: null,
    };
    const documentGeneration = {
      generateReceipt: jest.fn().mockResolvedValue(generated),
    };
    const activityService = {
      documentGenerated: jest.fn().mockResolvedValue({}),
    };
    const service = new PaymentReceiptService(
      prisma as any,
      documentGeneration as any,
      activityService as any,
    );
    return { service, prisma, documentGeneration, activityService, generated };
  }

  it('generates the receipt the first time, links it to the payment and logs it', async () => {
    const { service, prisma, documentGeneration, activityService, generated } =
      build();

    const doc = await service.getOrCreate(finance, 'deal-1', 'pay-1');

    expect(doc).toBe(generated);
    expect(documentGeneration.generateReceipt).toHaveBeenCalledWith({
      companyId: 'company-1',
      dealId: 'deal-1',
      paymentId: 'pay-1',
      userId: 'finance-1',
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { receiptDocumentId: 'doc-new' },
    });
    expect(activityService.documentGenerated).toHaveBeenCalledWith(
      expect.anything(),
      'Receipt R-2026-0007 issued',
    );
  });

  it('returns the existing receipt instead of printing a second one', async () => {
    const existing = { id: 'doc-1', deletedAt: null };
    const { service, documentGeneration } = build({
      payment: {
        id: 'pay-1',
        receiptNumber: 'R-2026-0007',
        receiptDocument: existing,
      },
    });

    await expect(service.getOrCreate(finance, 'deal-1', 'pay-1')).resolves.toBe(
      existing,
    );
    expect(documentGeneration.generateReceipt).not.toHaveBeenCalled();
  });

  it('prints a fresh copy when the earlier file was deleted', async () => {
    const { service, documentGeneration } = build({
      payment: {
        id: 'pay-1',
        receiptNumber: 'R-2026-0007',
        receiptDocument: { id: 'doc-1', deletedAt: new Date() },
      },
    });

    await service.getOrCreate(finance, 'deal-1', 'pay-1');

    expect(documentGeneration.generateReceipt).toHaveBeenCalled();
  });

  it('refuses a refund, which has no receipt number', async () => {
    const { service } = build({
      payment: { id: 'pay-1', receiptNumber: null, receiptDocument: null },
    });

    await expect(
      service.getOrCreate(finance, 'deal-1', 'pay-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps a branch-scoped user to deals in their branch', async () => {
    const { service, prisma } = build({ deal: null });

    await expect(service.getOrCreate(head, 'deal-1', 'pay-1')).rejects.toThrow(
      DealNotFoundException,
    );
    expect(prisma.deal.findFirst.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ branchId: 'branch-1' }),
    );
  });

  it('404s a payment that belongs to another deal or was deleted', async () => {
    const { service, prisma } = build({ payment: null });

    await expect(
      service.getOrCreate(finance, 'deal-1', 'pay-9'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.payment.findFirst.mock.calls[0][0].where).toEqual({
      id: 'pay-9',
      dealId: 'deal-1',
      deletedAt: null,
    });
  });
});
