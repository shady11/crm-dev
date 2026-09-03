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

export const DOCUMENT_TYPE_LABEL_KEYS: Record<DocumentType, string> = {
    PASSPORT: "documents:type.passport",
    CONTRACT: "documents:type.contract",
    RESERVATION: "documents:type.reservation",
    PAYMENT_RECEIPT: "documents:type.payment_receipt",
    PAYMENT_SCHEDULE: "documents:type.payment_schedule",
    INVOICE: "documents:type.invoice",
    AGREEMENT: "documents:type.agreement",
    POWER_OF_ATTORNEY: "documents:type.power_of_attorney",
    FLOOR_PLAN: "documents:type.floor_plan",
    OTHER: "documents:type.other",
};

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}