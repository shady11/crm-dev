import {api} from "@/lib/api";
import type {DealStatus} from "@/features/deals/types/deal.types";
import type {PaymentMethod, PaymentType} from "@/features/deals/api/deals.api";

export type PaymentRegisterFilters = {
    /** Calendar days, both inclusive, as YYYY-MM-DD. */
    from?: string;
    to?: string;
    paymentMethod?: PaymentMethod;
    paymentType?: PaymentType;
    branchId?: string;
    projectId?: string;
    search?: string;
};

export type PaymentRegisterItem = {
    id: string;
    paidAt: string;
    /** Signed: a refund is negative. */
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    reference: string | null;
    note: string | null;
    recordedBy: {id: string; fullName: string} | null;
    deal: {id: string; dealNumber: string; status: DealStatus};
    client: {id: string; fullName: string};
    unitNumber: string;
    projectName: string;
    branchName: string | null;
};

export type PaymentRegisterTotals = {
    count: number;
    received: number;
    refunded: number;
    net: number;
    byMethod: {method: PaymentMethod; amount: number}[];
};

export type PaymentRegisterResponse = {
    items: PaymentRegisterItem[];
    meta: {page: number; limit: number; total: number; pages: number};
    totals: PaymentRegisterTotals;
};

export async function getPaymentRegister(filters: PaymentRegisterFilters & {page: number; limit: number}) {
    const response = await api.get<PaymentRegisterResponse>("/payments", {params: filters});
    return response.data;
}

export async function downloadPaymentsExport(filters: PaymentRegisterFilters) {
    const period = [filters.from, filters.to].filter(Boolean).join("_");
    await downloadXlsx("/payments/export", filters, `payments-${period || today()}.xlsx`);
}

export async function downloadReceivablesExport(filters: Pick<PaymentRegisterFilters, "branchId" | "projectId">) {
    await downloadXlsx("/payments/receivables/export", filters, `receivables-${today()}.xlsx`);
}

async function downloadXlsx(path: string, params: object, filename: string) {
    const response = await api.get<Blob>(path, {params, responseType: "blob"});
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}
