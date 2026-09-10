import {
  Deal,
  DealStatus,
  DiscountApprovalStatus,
  Prisma,
  UserRole,
} from '@/generated/prisma/client';
import { DealDomainService } from './deal-domain.service';
import { DiscountPendingApprovalException } from '@/modules/deals/exceptions';

describe('DealDomainService discount approval', () => {
  const service = new DealDomainService();
  const company = {
    salesManagerDiscountLimit: new Prisma.Decimal(5),
    salesHeadDiscountLimit: new Prisma.Decimal(15),
  };

  describe('requiresDiscountApproval', () => {
    it('does not require approval for a SALES_MANAGER within their own limit', () => {
      expect(
        service.requiresDiscountApproval(
          new Prisma.Decimal(5),
          UserRole.SALES_MANAGER,
          company,
        ),
      ).toBe(false);
    });

    it('requires approval for a SALES_MANAGER above their own limit', () => {
      expect(
        service.requiresDiscountApproval(
          new Prisma.Decimal(5.01),
          UserRole.SALES_MANAGER,
          company,
        ),
      ).toBe(true);
    });

    it('does not require approval for a SALES_HEAD within their own (higher) limit', () => {
      expect(
        service.requiresDiscountApproval(
          new Prisma.Decimal(15),
          UserRole.SALES_HEAD,
          company,
        ),
      ).toBe(false);
    });

    it('requires approval for a SALES_HEAD above their own limit', () => {
      expect(
        service.requiresDiscountApproval(
          new Prisma.Decimal(15.01),
          UserRole.SALES_HEAD,
          company,
        ),
      ).toBe(true);
    });

    it('never requires approval for a COMPANY_ADMIN, at any percent', () => {
      expect(
        service.requiresDiscountApproval(
          new Prisma.Decimal(99),
          UserRole.COMPANY_ADMIN,
          company,
        ),
      ).toBe(false);
    });
  });

  describe('canDecideDiscount', () => {
    it('lets a SALES_HEAD decide a request within their own band', () => {
      expect(
        service.canDecideDiscount(
          new Prisma.Decimal(15),
          UserRole.SALES_HEAD,
          company,
        ),
      ).toBe(true);
    });

    it('does not let a SALES_HEAD decide a request above their own band', () => {
      expect(
        service.canDecideDiscount(
          new Prisma.Decimal(15.01),
          UserRole.SALES_HEAD,
          company,
        ),
      ).toBe(false);
    });

    it('lets a COMPANY_ADMIN decide any request', () => {
      expect(
        service.canDecideDiscount(
          new Prisma.Decimal(99),
          UserRole.COMPANY_ADMIN,
          company,
        ),
      ).toBe(true);
    });

    it('never lets a SALES_MANAGER decide a request', () => {
      expect(
        service.canDecideDiscount(
          new Prisma.Decimal(1),
          UserRole.SALES_MANAGER,
          company,
        ),
      ).toBe(false);
    });
  });

  describe('ensureCanSignContract with a pending discount', () => {
    const dealWith = (discountApprovalStatus: DiscountApprovalStatus): Deal =>
      ({
        status: DealStatus.RESERVED,
        discountApprovalStatus,
      }) as unknown as Deal;

    it('blocks signing while a discount request is PENDING', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.PENDING)),
      ).toThrow(DiscountPendingApprovalException);
    });

    it('allows signing when there is no discount request', () => {
      expect(() =>
        service.ensureCanSignContract(dealWith(DiscountApprovalStatus.NONE)),
      ).not.toThrow();
    });

    it('allows signing once a discount has been approved', () => {
      expect(() =>
        service.ensureCanSignContract(
          dealWith(DiscountApprovalStatus.APPROVED),
        ),
      ).not.toThrow();
    });

    it('allows signing after a discount was rejected (deal reverts to list price)', () => {
      expect(() =>
        service.ensureCanSignContract(
          dealWith(DiscountApprovalStatus.REJECTED),
        ),
      ).not.toThrow();
    });
  });
});
