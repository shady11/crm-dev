import {
  Deal,
  DealStatus,
  DiscountApprovalStatus,
  Prisma,
} from '@/generated/prisma/client';
import { DealDomainService } from './deal-domain.service';
import { ClientDetailsMissingException, DiscountPendingApprovalException } from '@/modules/deals/exceptions';

describe('DealDomainService discount approval', () => {
  const service = new DealDomainService();
  const SALES_MANAGER_LIMIT = 5;
  const SALES_HEAD_LIMIT = 15;

  describe('requiresDiscountApproval', () => {
    it('does not require approval for a requester within their own limit', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(5), SALES_MANAGER_LIMIT),
      ).toBe(false);
    });

    it('requires approval for a requester above their own limit', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(5.01), SALES_MANAGER_LIMIT),
      ).toBe(true);
    });

    it('does not require approval for a requester within their own (higher) limit', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(15), SALES_HEAD_LIMIT),
      ).toBe(false);
    });

    it('requires approval for a requester above their own (higher) limit', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(15.01), SALES_HEAD_LIMIT),
      ).toBe(true);
    });

    it('never requires approval for a requester with an unlimited (null) ceiling, at any percent', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(99), null),
      ).toBe(false);
    });

    it('treats a missing (undefined) limit as the most restrictive case, 0', () => {
      expect(
        service.requiresDiscountApproval(new Prisma.Decimal(0.01), undefined),
      ).toBe(true);
    });
  });

  describe('canDecideDiscount', () => {
    it('lets a decider with the permission decide a request within their own band', () => {
      expect(
        service.canDecideDiscount(new Prisma.Decimal(15), true, SALES_HEAD_LIMIT),
      ).toBe(true);
    });

    it('does not let a decider decide a request above their own band', () => {
      expect(
        service.canDecideDiscount(new Prisma.Decimal(15.01), true, SALES_HEAD_LIMIT),
      ).toBe(false);
    });

    it('lets a decider with an unlimited (null) ceiling decide any request', () => {
      expect(
        service.canDecideDiscount(new Prisma.Decimal(99), true, null),
      ).toBe(true);
    });

    it('never lets a decider without the deals.approve_discount permission decide, regardless of limit', () => {
      expect(
        service.canDecideDiscount(new Prisma.Decimal(1), false, null),
      ).toBe(false);
    });
  });

  describe('ensureCanSignContract with a pending discount', () => {
    const withId = {passport: 'AN1234567', pin: '21234567890123'};

    const dealWith = (discountApprovalStatus: DiscountApprovalStatus): Deal =>
      ({
        status: DealStatus.RESERVED,
        discountApprovalStatus,
      }) as unknown as Deal;

    it('blocks signing while a discount request is PENDING', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.PENDING), withId),
      ).toThrow(DiscountPendingApprovalException);
    });

    it('allows signing when there is no discount request', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.NONE), withId),
      ).not.toThrow();
    });

    it('allows signing once a discount has been approved', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.APPROVED), withId),
      ).not.toThrow();
    });

    it('blocks signing until the client has a passport number and PIN, naming what is missing', () => {
      const deal = dealWith(DiscountApprovalStatus.NONE);
      expect(() => service.ensureCanSignContract(deal, {passport: null, pin: ' '})).toThrow(
        new ClientDetailsMissingException(['passport', 'pin']),
      );
      expect(() => service.ensureCanSignContract(deal, {...withId, pin: null})).toThrow(
        "Add the client's personal number (PIN) before signing the contract.",
      );
    });

    it('allows signing after a discount was rejected (deal reverts to list price)', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.REJECTED), withId),
      ).not.toThrow();
    });
  });
});
