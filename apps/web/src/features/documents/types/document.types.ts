export const DocumentOwnerType = {
    LEAD: "LEAD", CLIENT: "CLIENT", DEAL: "DEAL", PROJECT: "PROJECT", UNIT: "UNIT",
} as const;
export type DocumentOwnerType = (typeof DocumentOwnerType)[keyof typeof DocumentOwnerType];

export const DocumentType = {
    PASSPORT: "PASSPORT",
    CONTRACT: "CONTRACT",
    RESERVATION: "RESERVATION",
    PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
    PAYMENT_SCHEDULE: "PAYMENT_SCHEDULE",
    INVOICE: "INVOICE",
    AGREEMENT: "AGREEMENT",
    POWER_OF_ATTORNEY: "POWER_OF_ATTORNEY",
    FLOOR_PLAN: "FLOOR_PLAN",
    OTHER: "OTHER",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    PASSPORT: "Passport",
    CONTRACT: "Contract",
    RESERVATION: "Reservation",
    PAYMENT_RECEIPT: "Payment receipt",
    PAYMENT_SCHEDULE: "Payment schedule",
    INVOICE: "Invoice",
    AGREEMENT: "Agreement",
    POWER_OF_ATTORNEY: "Power of attorney",
    FLOOR_PLAN: "Floor plan",
    OTHER: "Other",
};

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}