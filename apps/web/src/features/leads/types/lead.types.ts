export const LeadStatus = {
    NEW: "NEW",
    CONTACTED: "CONTACTED",
    QUALIFIED: "QUALIFIED",
    MEETING: "MEETING",
    NEGOTIATION: "NEGOTIATION",
    CONVERTED: "CONVERTED",
    LOST: "LOST",
} as const;

export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: "New",
    [LeadStatus.CONTACTED]: "Contacted",
    [LeadStatus.QUALIFIED]: "Qualified",
    [LeadStatus.MEETING]: "Meeting",
    [LeadStatus.NEGOTIATION]: "Negotiation",
    [LeadStatus.CONVERTED]: "Converted",
    [LeadStatus.LOST]: "Lost",
};

export const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: "bg-blue-400",
    [LeadStatus.CONTACTED]: "bg-amber-400",
    [LeadStatus.QUALIFIED]: "bg-violet-400",
    [LeadStatus.MEETING]: "bg-cyan-400",
    [LeadStatus.NEGOTIATION]: "bg-orange-400",
    [LeadStatus.CONVERTED]: "bg-emerald-400",
    [LeadStatus.LOST]: "bg-gray-400",
};
