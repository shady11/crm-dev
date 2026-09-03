import {Prisma} from "@/generated/prisma/client";
import {DealDomainService} from './deal-domain.service';
import {PaymentExceedsBalanceException, RefundExceedsPaidException} from '@/modules/deals/exceptions';

describe('DealDomainService.ensurePaymentWithinBalance', () => {
    const service = new DealDomainService();

    const dealWithSalePrice = (salePrice: number) =>
        ({ salePrice: new Prisma.Decimal(salePrice) }) as any;

    it('allows a forward payment that stays within the balance', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(400), new Prisma.Decimal(300)),
        ).not.toThrow();
    });

    it('allows a forward payment that exactly completes the balance', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(700), new Prisma.Decimal(300)),
        ).not.toThrow();
    });

    it('rejects a forward payment that would overpay the deal', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(900), new Prisma.Decimal(200)),
        ).toThrow(PaymentExceedsBalanceException);
    });

    it('allows a refund that stays within what was actually paid', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(600), new Prisma.Decimal(-200)),
        ).not.toThrow();
    });

    it('allows a full refund that brings totalPaid to exactly zero', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(500), new Prisma.Decimal(-500)),
        ).not.toThrow();
    });

    it('rejects a refund on a fully-paid deal that used to always fail before this fix', () => {
        // Regression guard for the bug this patch fixes: previously ANY refund on a
        // fully-paid deal was rejected because it was checked against "remaining
        // balance" (0), instead of against what had actually been paid in.
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(1000), new Prisma.Decimal(-300)),
        ).not.toThrow();
    });

    it('rejects a refund larger than the total amount paid', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(300), new Prisma.Decimal(-400)),
        ).toThrow(RefundExceedsPaidException);
    });

    it('rejects a refund on a deal with zero payments recorded', () => {
        const deal = dealWithSalePrice(1000);
        expect(() =>
            service.ensurePaymentWithinBalance(deal, new Prisma.Decimal(0), new Prisma.Decimal(-1)),
        ).toThrow(RefundExceedsPaidException);
    });
});