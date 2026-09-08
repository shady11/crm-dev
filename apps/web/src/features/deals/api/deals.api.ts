import {api} from "@/lib/api";
import type {DealStatus} from "@/features/deals/types/deal.types.ts";
import type {PaginatedResponse} from "@/lib/api-types.ts";
import type {UserRole} from "@/features/users/types/user.types.ts";

export type FinancingType = "CASH" | "INSTALLMENT" | "MORTGAGE";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MBANK" | "OPTIMA" | "ELKART" | "OTHER";
export type PaymentType = "DEPOSIT" | "INSTALLMENT" | "FINAL" | "REFUND";
export type PaymentScheduleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

type DealClient = { id: string; fullName: string; phone: string; email:string };
type DealManager = { id: string; fullName: string; role: UserRole } | null;
type DealUnit = {
    id: string;
    number: string;
    type: "APARTMENT" | "COMMERCIAL" | "PARKING" | "STORAGE";
    status: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE";
    rooms: number | null;
    area: number;
    price: number;
    pricePerSqm: number | null;
    block?: { id: string; name: string };
    entrance?: { id: string; name: string };
    floor?: { id: string; number: number };
};
type DealProject = { id: string; name: string };

export type Deal = {
    id: string;
    dealNumber: string;
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
    cancelledAt: string | null;
    cancelReason: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    client: DealClient;
    manager: DealManager;
    project: DealProject;
    unit: DealUnit;
};

export type DealActivity = {
    id: string;
    type: string;
    action: string;
    title: string;
    description: string | null;
    createdAt: string;
};

type DealPayment = {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    paidAt: string;
    reference: string | null;
    note: string | null;
    createdAt: string;
};

type DealPaymentSchedule = {
    id: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: PaymentScheduleStatus;
    order: number;
};

export type DealDetails = Deal & {
    activities: DealActivity[];
    payments: DealPayment[];
    paymentSchedules: DealPaymentSchedule[];
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

export type DealStatusSummaryItem = { status: DealStatus; count: number };

export type GetDealsParams = {
    status?: DealStatus;
    projectId?: string;
    clientId?: string;
    managerId?: string;
    // Admin-only cross-branch filter (BR-B3); ignored server-side for a
    // branch-scoped caller, whose own branch filter already takes precedence.
    branchId?: string;
    search?: string;
    page?: number;
    limit?: number;
};

export type GeneratePaymentSchedulePayload = {
    installments: number;
    firstPaymentDate: string;
    intervalMonths?: number;
};

export type CreatePaymentPayload = {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    paidAt: string;
    reference?: string;
    note?: string;
};


export async function reserveUnit(payload: ReserveUnitPayload) {
    const response = await api.post<Deal>("/deals/reserve", payload);
    return response.data;
}

export async function getDeals(params?: GetDealsParams) {
    const response = await api.get<PaginatedResponse<Deal>>("/deals", { params });
    return response.data;
}

export async function getDealStatusSummary(projectId?: string, branchId?: string) {
    const response = await api.get<DealStatusSummaryItem[]>("/deals/status-summary", { params: { projectId, branchId } });
    return response.data;
}

export async function getDeal(id: string) {
    const response = await api.get<DealDetails>(`/deals/${id}`);
    return response.data;
}

export async function extendReservation(id: string, reservationExpiresAt: string) {
    const response = await api.post<DealDetails>(`/deals/${id}/extend`, { reservationExpiresAt });
    return response.data;
}

export async function signContract(id: string, payload: { contractNumber: string; contractDate: string; note?: string }) {
    const response = await api.post<DealDetails>(`/deals/${id}/sign-contract`, payload);
    return response.data;
}

export async function activateDeal(id: string) {
    const response = await api.post<DealDetails>(`/deals/${id}/activate`, {});
    return response.data;
}

export async function cancelDeal(id: string, reason?: string) {
    const response = await api.post<DealDetails>(`/deals/${id}/cancel`, { reason });
    return response.data;
}

export async function generatePaymentSchedule(dealId: string, payload: GeneratePaymentSchedulePayload) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/payment-schedule`, payload);
    return response.data;
}

export async function createPayment(dealId: string, payload: CreatePaymentPayload) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/payments`, payload);
    return response.data;
}

export async function completeDeal(dealId: string) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/complete`, {});
    return response.data;
}