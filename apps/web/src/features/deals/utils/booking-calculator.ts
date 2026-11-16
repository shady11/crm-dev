import type {BookingCalculation} from "../types/booking.types";

interface Input {
    price: number;

    discountPercent: number;

    deposit: number;
}

export function calculateBooking({
                                     price,
                                     discountPercent,
                                     deposit,
                                 }: Input): BookingCalculation {
    const discountAmount = price * (discountPercent / 100);

    const finalPrice = price - discountAmount;

    const remaining = Math.max(finalPrice - deposit, 0);

    return {
        price,
        discountAmount,
        finalPrice,
        deposit,
        remaining,
    };
}

/**
 * E2E-7: a discount above the user's own limit waits for someone else's
 * decision; the API holds the deal at the list price until then. Same rule
 * as the API (DealDomainService.requiresDiscountApproval).
 */
export function discountNeedsApproval(percent: number, limit: number | null | undefined) {
    if (percent <= 0 || limit === null) return false;
    return percent > (limit ?? 0);
}
