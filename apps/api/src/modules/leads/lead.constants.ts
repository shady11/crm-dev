import {LeadStatus, Prisma} from "@/generated/prisma/client";

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

/**
 * An open lead whose next contact was due on an earlier day and hasn't been
 * moved: a missed follow-up (SH-6). Same rule the leads table uses to show
 * the date in red. Shared by the leads filter, the dashboard's Needs
 * attention and My team, so their counts agree.
 */
export function overdueFollowUpWhere(now: Date = new Date()): Prisma.LeadWhereInput {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return {status: {in: OPEN_LEAD_STATUSES}, nextContactAt: {lt: startOfToday}};
}
