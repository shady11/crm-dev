import {LeadStatus} from "@/generated/prisma/client";

// A lead stops being "open" once it converts to a client or is marked lost —
// those are the two terminal states. Used to decide what still needs a
// manager when one is deactivated (CA-B1).
export const OPEN_LEAD_STATUSES: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "MEETING",
    "NEGOTIATION",
];
