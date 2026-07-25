import {api} from "@/lib/api";

export type DealStatus =
    | "RESERVED"
    | "CONTRACT_SIGNED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED";

export type FinancingType = "CASH" | "INSTALLMENT" | "MORTGAGE";

export type Deal = {
    id: string;
    status: DealStatus;
    financingType: FinancingType | null;
    listPrice: number;
    salePrice: number;
    discountAmount: number | null;
    discountPercent: number | null;
    deposit: number | null;
    reservedAt: string | null;
    reservationExpiresAt: string | null;
    contractNumber: string | null;
    contractDate: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    client: { id: string; fullName: string; phone: string };
    manager: { id: string; fullName: string } | null;
    unit: { id: string; number: string; area: number; price: number };
};

export type ReserveUnitPayload = {
    unitId: string;
    clientId: string;
    managerId?: string;
    financingType?: FinancingType;
    salePrice: number;
    discountAmount?: number;
    discountPercent?: number;
    deposit?: number;
    reservationExpiresAt?: string;
    note?: string;
};

export async function reserveUnit(payload: ReserveUnitPayload) {
    const response = await api.post<Deal>("/deals/reserve", payload);
    return response.data;
}

export async function getDeals(params?: {
    status?: DealStatus;
    projectId?: string;
    clientId?: string;
    managerId?: string;
}) {
    const response = await api.get<Deal[]>("/deals", { params });
    return response.data;
}

export async function getDeal(id: string) {
    const response = await api.get<Deal>(`/deals/${id}`);
    return response.data;
}