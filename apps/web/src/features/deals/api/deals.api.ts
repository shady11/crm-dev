import {api} from "@/lib/api";
import type {DealStatus} from "@/features/deals/types/deal.types.ts";
import type {PaginatedResponse} from "@/lib/api-types.ts";

export type FinancingType = "CASH" | "INSTALLMENT" | "MORTGAGE";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MBANK" | "OPTIMA" | "ELKART" | "OTHER";
export type PaymentType = "DEPOSIT" | "INSTALLMENT" | "FINAL" | "REFUND";
export type PaymentScheduleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

type DealClient = {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    // Both needed before a contract can be signed (see DealDomainService.ensureCanSignContract).
    passport: string | null;
    pin: string | null;
};
type DealManager = {
    id: string;
    fullName: string;
    phone: string | null;
    email: string;
    isActive: boolean;
    role: {id: string; name: string};
} | null;
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

export type DiscountApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type Deal = {
    id: string;
    dealNumber: string;
    status: DealStatus;
    branchId: string | null;
    financingType: FinancingType | null;
    listPrice: number;
    salePrice: number;
    discountAmount: number | null;
    discountPercent: number | null;
    deposit: number | null;
    discountApprovalStatus: DiscountApprovalStatus;
    requestedDiscountPercent: number | null;
    requestedDiscountAmount: number | null;
    discountRejectionReason: string | null;
    reservedAt: string | null;
    reservationExpiresAt: string | null;
    reservationExtensionCount: number;
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
    /** Overdue installments on this deal; only on list rows, null when none. */
    overdue?: { amount: number; installments: number; since: string } | null;
};

export type DealActivity = {
    id: string;
    type: string;
    action: string;
    title: string;
    templateKey?: string | null;
    templateParams?: Record<string, unknown> | null;
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
    /** R-YYYY-NNNN; null for a refund. */
    receiptNumber: string | null;
    /** Who recorded it; null for payments from before this was tracked. */
    user: { id: string; fullName: string } | null;
};

type DealPaymentSchedule = {
    id: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: PaymentScheduleStatus;
    order: number;
};

/** A payment taken off the books (FIN-3): kept for the record, counted nowhere. */
export type VoidedPayment = {
    id: string;
    amount: number;
    paymentType: PaymentType;
    paymentMethod: PaymentMethod;
    paidAt: string;
    receiptNumber: string | null;
    voidReason: string | null;
    voidedAt: string;
    voidedBy: { id: string; fullName: string } | null;
};

export type DealDetails = Deal & {
    activities: DealActivity[];
    payments: DealPayment[];
    paymentSchedules: DealPaymentSchedule[];
    /** Only on GET /deals/:id; mutation responses leave it out. */
    voidedPayments?: VoidedPayment[];
    /**
     * Only on GET /deals/:id, and null unless a discount is pending: whether
     * the viewer may decide it (within their own limit), and who is asked.
     */
    discountDecision?: DiscountDecision | null;
};

export type DiscountDecision = {
    canDecide: boolean;
    approvers: { id: string; fullName: string }[];
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

// Kept in sync with DEAL_SORTABLE_FIELDS in the API's deal-query.dto.ts.
export type DealSortField = "dealNumber" | "status" | "salePrice" | "createdAt";

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
    sortBy?: DealSortField;
    sortOrder?: "asc" | "desc";
    attention?: DealAttentionFilter;
};

// The dashboard's "Needs attention" queues as a list filter, so "View all"
// opens the same deals the dashboard counted.
export const DEAL_ATTENTION_FILTERS = ["discount_pending", "overdue_payments"] as const;
export type DealAttentionFilter = typeof DEAL_ATTENTION_FILTERS[number];

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

// `mine`: opt-in, silently ignored server-side unless the caller actually
// holds dashboard.my_performance — safe for the dashboard to always pass
// true regardless of viewer role. The standalone Deals list page never
// passes it, so its own summary cards stay whole-branch (it has its own
// explicit manager filter instead).
export async function getDealStatusSummary(projectId?: string, branchId?: string, mine?: boolean) {
    const response = await api.get<DealStatusSummaryItem[]>("/deals/status-summary", { params: { projectId, branchId, mine } });
    return response.data;
}

export async function getDeal(id: string) {
    const response = await api.get<DealDetails>(`/deals/${id}`);
    return response.data;
}

// The caller's company limits on reservation terms — see
// DealDomainService.resolveReservationExpiry in the API.
export type ReservationPolicy = {
    reservationDefaultDays: number;
    reservationMaxDays: number;
    reservationMaxExtensions: number;
};

export async function getReservationPolicy() {
    const response = await api.get<ReservationPolicy>("/deals/reservation-policy");
    return response.data;
}

// reason is required once the reservation has used all its extensions (SH-11).
export async function extendReservation(id: string, reservationExpiresAt: string, reason?: string) {
    const response = await api.post<DealDetails>(`/deals/${id}/extend`, { reservationExpiresAt, reason });
    return response.data;
}

// SH-11: at the extension limit, asks the team leads who may go past it.
export async function requestReservationExtension(id: string) {
    const response = await api.post<{ notified: number }>(`/deals/${id}/extension-request`);
    return response.data;
}

export async function approveDiscount(dealId: string) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/discount/approve`);
    return response.data;
}

export async function rejectDiscount(dealId: string, reason: string) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/discount/reject`, { reason });
    return response.data;
}

export type GeneratableDocumentType = "RESERVATION" | "CONTRACT";

/** Re-renders a deal's reservation agreement or contract PDF from its current data. */
export async function generateDealDocument(dealId: string, type: GeneratableDocumentType) {
    const response = await api.post(`/deals/${dealId}/documents/${type}/generate`);
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

export async function voidPayment(dealId: string, paymentId: string, reason: string) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/payments/${paymentId}/void`, { reason });
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

// SH-A1: SALES_HEAD moving a deal between their own team's SALES_MANAGERs.
export async function reassignDealManager(dealId: string, managerId: string) {
    const response = await api.post<DealDetails>(`/deals/${dealId}/reassign`, { managerId });
    return response.data;
}