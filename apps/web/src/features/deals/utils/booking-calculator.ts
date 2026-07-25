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