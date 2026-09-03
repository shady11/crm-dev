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

export const LEAD_STATUS_LABEL_KEYS: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: "leads:status.new",
    [LeadStatus.CONTACTED]: "leads:status.contacted",
    [LeadStatus.QUALIFIED]: "leads:status.qualified",
    [LeadStatus.MEETING]: "leads:status.meeting",
    [LeadStatus.NEGOTIATION]: "leads:status.negotiation",
    [LeadStatus.CONVERTED]: "leads:status.converted",
    [LeadStatus.LOST]: "leads:status.lost",
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
