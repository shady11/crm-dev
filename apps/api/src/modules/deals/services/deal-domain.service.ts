import {Injectable} from '@nestjs/common';
import {
    BlockSalesStatus,
    Company,
    Deal,
    DealStatus,
    DiscountApprovalStatus,
    PaymentSchedule,
    PaymentScheduleStatus,
    Prisma,
    Project,
    Unit,
    UnitStatus,
} from '@/generated/prisma/client';

import {
    ActiveDealExistsException,
    BlockNotOnSaleException,
    ClientDetailsMissingException,
    type ContractClientField,
    DiscountPendingApprovalException,
    InvalidDealStateException,
    ProjectNotOpenForSalesException,
    PaymentExceedsBalanceException,
    RefundExceedsPaidException,
    ReservationDateInvalidException,
    ReservationExpiredException,
    ReservationExtensionLimitException,
    UnitNotAvailableException,
} from '../exceptions';
import {BOOKABLE_PROJECT_STATUSES} from '../deal.constants';

export type ReservationPolicy = Pick<
    Company,
    'reservationDefaultDays' | 'reservationMaxDays' | 'reservationMaxExtensions'
>;

const DAY_MS = 24 * 60 * 60 * 1000;

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

    ensureProjectOpenForSales(project: Pick<Project, 'name' | 'status'>): void {
        if (!BOOKABLE_PROJECT_STATUSES.includes(project.status)) {
            throw new ProjectNotOpenForSalesException(project.name, project.status);
        }
    }

    /**
     * A block that hasn't opened for sales can't be booked yet; a completed
     * (handed-over) block still sells its remaining units.
     */
    ensureBlockOpenForSales(block: {name: string; salesStatus: BlockSalesStatus}): void {
        if (block.salesStatus === BlockSalesStatus.UPCOMING) {
            throw new BlockNotOnSaleException(block.name);
        }
    }

    ensureNoActiveDeal(activeDeal: Deal | null, unit: Unit): void {
        if (activeDeal) {
            throw new ActiveDealExistsException(unit.number);
        }
    }

    /**
     * The expiry a new reservation gets: the requested date if it is within
     * the company's maximum term, or the company's default term when none was
     * requested — so no reservation is ever open-ended.
     */
    resolveReservationExpiry(
        requested: Date | undefined,
        policy: ReservationPolicy,
        now: Date = new Date(),
    ): Date {
        if (!requested) {
            return new Date(now.getTime() + policy.reservationDefaultDays * DAY_MS);
        }

        this.ensureWithinReservationTerm(requested, policy, now);
        return requested;
    }

    ensureCanExtendReservation(
        deal: Deal,
        reservationExpiresAt: Date,
        policy: ReservationPolicy,
        now: Date = new Date(),
    ): void {
        this.ensureStatus(deal, DealStatus.RESERVED);

        if (
            deal.reservationExpiresAt &&
            deal.reservationExpiresAt < now
        ) {
            throw new ReservationExpiredException();
        }

        if (deal.reservationExtensionCount >= policy.reservationMaxExtensions) {
            throw new ReservationExtensionLimitException(policy.reservationMaxExtensions);
        }

        if (deal.reservationExpiresAt && reservationExpiresAt <= deal.reservationExpiresAt) {
            throw new ReservationDateInvalidException(
                'The new expiration date must be later than the current one.',
            );
        }

        this.ensureWithinReservationTerm(reservationExpiresAt, policy, now);
    }

    private ensureWithinReservationTerm(
        reservationExpiresAt: Date,
        policy: ReservationPolicy,
        now: Date,
    ): void {
        if (reservationExpiresAt <= now) {
            throw new ReservationDateInvalidException();
        }

        if (reservationExpiresAt.getTime() > now.getTime() + policy.reservationMaxDays * DAY_MS) {
            throw new ReservationDateInvalidException(
                `Reservation expiration date can be at most ${policy.reservationMaxDays} days from now.`,
            );
        }
    }

    ensureCanSignContract(deal: Deal, client: {passport: string | null; pin: string | null}): void {
        this.ensureStatus(deal, DealStatus.RESERVED);

        if (deal.discountApprovalStatus === DiscountApprovalStatus.PENDING) {
            throw new DiscountPendingApprovalException();
        }

        const missing: ContractClientField[] = [];
        if (!client.passport?.trim()) missing.push('passport');
        if (!client.pin?.trim()) missing.push('pin');
        if (missing.length > 0) {
            throw new ClientDetailsMissingException(missing);
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