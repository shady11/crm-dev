import {Injectable} from '@nestjs/common';
import {
    Company,
    Deal,
    DealStatus,
    DiscountApprovalStatus,
    PaymentSchedule,
    PaymentScheduleStatus,
    Prisma,
    Unit,
    UnitStatus,
    UserRole,
} from '@/generated/prisma/client';

import {
    ActiveDealExistsException,
    DiscountPendingApprovalException,
    InvalidDealStateException,
    PaymentExceedsBalanceException,
    RefundExceedsPaidException,
    ReservationDateInvalidException,
    ReservationExpiredException,
    UnitNotAvailableException,
} from '../exceptions';

@Injectable()
export class DealDomainService {
    private readonly activeStatuses: DealStatus[] = [
        DealStatus.RESERVED,
        DealStatus.CONTRACT_SIGNED,
        DealStatus.ACTIVE,
    ];

    private readonly finishedStatuses: DealStatus[] = [
        DealStatus.COMPLETED,
        DealStatus.CANCELLED,
        DealStatus.EXPIRED,
    ];

    ensureUnitCanBeReserved(unit: Unit): void {
        if (unit.status !== UnitStatus.AVAILABLE) {
            throw new UnitNotAvailableException(unit.number);
        }
    }

    ensureNoActiveDeal(activeDeal: Deal | null, unit: Unit): void {
        if (activeDeal) {
            throw new ActiveDealExistsException(unit.number);
        }
    }

    ensureCanExtendReservation(
        deal: Deal,
        reservationExpiresAt: Date,
    ): void {
        this.ensureStatus(deal, DealStatus.RESERVED);

        if (
            deal.reservationExpiresAt &&
            deal.reservationExpiresAt < new Date()
        ) {
            throw new ReservationExpiredException();
        }

        if (reservationExpiresAt <= new Date()) {
            throw new ReservationDateInvalidException();
        }
    }

    ensureCanSignContract(deal: Deal): void {
        this.ensureStatus(deal, DealStatus.RESERVED);

        if (deal.discountApprovalStatus === DiscountApprovalStatus.PENDING) {
            throw new DiscountPendingApprovalException();
        }
    }

    /**
     * A request at or below the requesting role's own discretionary limit
     * never needs a decision — this is what keeps an ordinary small discount
     * exactly as fast as it is today. COMPANY_ADMIN has no ceiling.
     */
    requiresDiscountApproval(
        requestedPercent: Prisma.Decimal,
        role: UserRole,
        company: Pick<Company, 'salesManagerDiscountLimit' | 'salesHeadDiscountLimit'>,
    ): boolean {
        if (role === UserRole.COMPANY_ADMIN) return false;

        const limit = role === UserRole.SALES_HEAD
            ? new Prisma.Decimal(company.salesHeadDiscountLimit)
            : new Prisma.Decimal(company.salesManagerDiscountLimit);

        return requestedPercent.greaterThan(limit);
    }

    /**
     * Who may decide a pending request: SALES_HEAD only up to their own
     * limit (their own band), COMPANY_ADMIN for anything above it. A
     * SALES_HEAD can't approve a request that would itself have needed
     * COMPANY_ADMIN sign-off had the sales head requested it directly.
     */
    canDecideDiscount(
        requestedPercent: Prisma.Decimal,
        role: UserRole,
        company: Pick<Company, 'salesHeadDiscountLimit'>,
    ): boolean {
        if (role === UserRole.COMPANY_ADMIN) return true;
        if (role !== UserRole.SALES_HEAD) return false;

        return requestedPercent.lessThanOrEqualTo(new Prisma.Decimal(company.salesHeadDiscountLimit));
    }

    ensureCanActivate(deal: Deal): void {
        this.ensureStatus(deal, DealStatus.CONTRACT_SIGNED);
    }

    ensureCanComplete(
        deal: Deal,
        schedules: Pick<PaymentSchedule, 'status'>[],
        totalPaid: Prisma.Decimal,
    ): void {
        this.ensureStatus(deal, DealStatus.ACTIVE);

        const unpaid = schedules.some(s => s.status !== PaymentScheduleStatus.PAID);
        if (unpaid) {
            throw new InvalidDealStateException(deal.status, 'All installments must be paid.');
        }

        if (totalPaid.lessThan(deal.salePrice)) {
            throw new InvalidDealStateException(deal.status, 'Deal is not fully paid.');
        }
    }

    ensureCanCancel(deal: Deal): void {
        this.ensureStatus(deal, this.activeStatuses);
    }

    ensurePaymentWithinBalance(
        deal: Deal,
        totalPaid: Prisma.Decimal,
        signedAmount: Prisma.Decimal,
    ): void {
        const newTotal = totalPaid.plus(signedAmount);

        if (newTotal.lessThan(0)) {
            throw new RefundExceedsPaidException();
        }

        if (signedAmount.greaterThan(0) && newTotal.greaterThan(deal.salePrice)) {
            throw new PaymentExceedsBalanceException();
        }
    }

    ensureStatus(
        deal: Deal,
        expected: DealStatus | DealStatus[],
    ): void {
        const statuses = Array.isArray(expected)
            ? expected
            : [expected];

        if (!statuses.includes(deal.status)) {
            throw new InvalidDealStateException(
                deal.status,
                statuses,
            );
        }
    }

    isActive(status: DealStatus): boolean {
        return this.activeStatuses.includes(status);
    }

    isFinished(status: DealStatus): boolean {
        return this.finishedStatuses.includes(status);
    }

    nextStatusAfterReservation(): DealStatus {
        return DealStatus.CONTRACT_SIGNED;
    }

    nextStatusAfterContract(): DealStatus {
        return DealStatus.ACTIVE;
    }

    nextStatusAfterCompletion(): DealStatus {
        return DealStatus.COMPLETED;
    }

    cancelledStatus(): DealStatus {
        return DealStatus.CANCELLED;
    }
}