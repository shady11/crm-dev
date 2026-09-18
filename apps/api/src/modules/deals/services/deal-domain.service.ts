import {Injectable} from '@nestjs/common';
import {
    Deal,
    DealStatus,
    DiscountApprovalStatus,
    PaymentSchedule,
    PaymentScheduleStatus,
    Prisma,
    Unit,
    UnitStatus,
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
     * A request at or below the requester's own Role.discountLimit never
     * needs a decision — this is what keeps an ordinary small discount
     * exactly as fast as it is today. `null` (Company Admin, by default)
     * means unlimited: no ceiling, never needs approval. `undefined` (a
     * caller whose AuthUser never carries the field — old test fixtures)
     * is treated as the most restrictive case, 0, rather than as unlimited.
     */
    requiresDiscountApproval(
        requestedPercent: Prisma.Decimal,
        requesterDiscountLimit: number | null | undefined,
    ): boolean {
        const limit = requesterDiscountLimit === undefined ? 0 : requesterDiscountLimit;
        if (limit === null) return false;

        return requestedPercent.greaterThan(new Prisma.Decimal(limit));
    }

    /**
     * Who may decide a pending request: whoever holds the
     * deals.approve_discount permission, up to their own Role.discountLimit
     * (or unlimited, for `null`). A decider with a lower band can't approve
     * a request that would itself have needed someone with a higher — or
     * no — ceiling to sign off, had they requested it directly.
     */
    canDecideDiscount(
        requestedPercent: Prisma.Decimal,
        deciderCanApprove: boolean,
        deciderDiscountLimit: number | null | undefined,
    ): boolean {
        if (!deciderCanApprove) return false;

        const limit = deciderDiscountLimit === undefined ? 0 : deciderDiscountLimit;
        if (limit === null) return true;

        return requestedPercent.lessThanOrEqualTo(new Prisma.Decimal(limit));
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