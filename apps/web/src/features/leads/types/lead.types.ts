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

// Why a lead was lost (SH-8). A fixed list, so the Leads filter can count them.
export const LeadLostReason = {
    PRICE: "PRICE",
    COMPETITOR: "COMPETITOR",
    LOCATION: "LOCATION",
    LAYOUT: "LAYOUT",
    FINANCING: "FINANCING",
    POSTPONED: "POSTPONED",
    UNREACHABLE: "UNREACHABLE",
    DUPLICATE: "DUPLICATE",
    OTHER: "OTHER",
} as const;

export type LeadLostReason = (typeof LeadLostReason)[keyof typeof LeadLostReason];

export const LEAD_LOST_REASON_LABEL_KEYS: Record<LeadLostReason, string> = {
    [LeadLostReason.PRICE]: "leads:lostReason.PRICE",
    [LeadLostReason.COMPETITOR]: "leads:lostReason.COMPETITOR",
    [LeadLostReason.LOCATION]: "leads:lostReason.LOCATION",
    [LeadLostReason.LAYOUT]: "leads:lostReason.LAYOUT",
    [LeadLostReason.FINANCING]: "leads:lostReason.FINANCING",
    [LeadLostReason.POSTPONED]: "leads:lostReason.POSTPONED",
    [LeadLostReason.UNREACHABLE]: "leads:lostReason.UNREACHABLE",
    [LeadLostReason.DUPLICATE]: "leads:lostReason.DUPLICATE",
    [LeadLostReason.OTHER]: "leads:lostReason.OTHER",
};
