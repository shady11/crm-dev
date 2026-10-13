import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";

export type UnitPriceRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** SH-2: a list-price change, pending or decided. */
export type UnitPriceRequest = {
    id: string;
    status: UnitPriceRequestStatus;
    currentPrice: number;
    requestedPrice: number;
    rejectionReason: string | null;
    createdAt: string;
    decidedAt: string | null;
    unit: {
        id: string; number: string; price: number; status: string;
        project: { id: string; name: string };
        block: { id: string; name: string };
    };
    requestedBy: { id: string; fullName: string } | null;
    decidedBy: { id: string; fullName: string } | null;
};

export async function getUnitPriceRequests(params: {status?: UnitPriceRequestStatus; page?: number; limit?: number}) {
    const response = await api.get<PaginatedResponse<UnitPriceRequest>>("/unit-price-requests", {params});
    return response.data;
}

export async function approveUnitPriceRequest(id: string) {
    const response = await api.post<UnitPriceRequest>(`/unit-price-requests/${id}/approve`);
    return response.data;
}

export async function rejectUnitPriceRequest(id: string, reason: string) {
    const response = await api.post<UnitPriceRequest>(`/unit-price-requests/${id}/reject`, {reason});
    return response.data;
}

/** The change as a share of the old price: −50 for a price cut in half. */
export function priceChangePercent(from: number, to: number) {
    if (!from) return 0;
    return Math.round(((to - from) / from) * 1000) / 10;
}
