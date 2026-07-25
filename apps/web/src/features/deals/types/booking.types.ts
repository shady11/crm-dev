export interface ApartmentSummary {
    id: string;

    number: string;

    floor: number;

    block: string;

    entrance: string;

    rooms: number;

    area: number;

    price: number;

    pricePerSqm: number;

    status: "AVAILABLE" | "RESERVED" | "SOLD";
}

export interface BookingCalculation {
    price: number;

    discountAmount: number;

    finalPrice: number;

    deposit: number;

    remaining: number;
}