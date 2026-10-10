export const PhaseSalesStatus = {
    UPCOMING: "UPCOMING",
    ON_SALE: "ON_SALE",
    COMPLETED: "COMPLETED",
} as const;

export type PhaseSalesStatus = (typeof PhaseSalesStatus)[keyof typeof PhaseSalesStatus];

export const PHASE_STATUS_LABEL_KEYS: Record<PhaseSalesStatus, string> = {
    UPCOMING: "phases:status.upcoming",
    ON_SALE: "phases:status.onSale",
    COMPLETED: "phases:status.completed",
};

export const PHASE_STATUS_BADGE_CLASSES: Record<PhaseSalesStatus, string> = {
    UPCOMING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    ON_SALE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    COMPLETED: "bg-secondary text-secondary-foreground",
};

/** A construction phase as the chessboard and unit details carry it. */
export type PhaseSummary = {
    id: string;
    name: string;
    order?: number;
    salesStatus: PhaseSalesStatus;
    completionDate: string | null;
};

export type Phase = PhaseSummary & {
    order: number;
    projectId: string;
    blocks: { id: string; name: string }[];
};

/** Units can be booked unless the block's phase hasn't opened for sales. */
export function isPhaseBookable(phase: PhaseSummary | null | undefined) {
    return phase?.salesStatus !== PhaseSalesStatus.UPCOMING;
}

/** "Q4 2027" etc. for an expected completion date (YYYY-MM-DD or ISO). */
export function completionQuarter(t: (key: string, options?: Record<string, unknown>) => string, date: string | null | undefined) {
    if (!date) return null;
    const [year, month] = date.slice(0, 10).split("-").map(Number);
    if (!year || !month) return null;
    return t("phases:quarter", { quarter: Math.ceil(month / 3), year });
}
