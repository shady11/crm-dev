export const BlockSalesStatus = {
    UPCOMING: "UPCOMING",
    ON_SALE: "ON_SALE",
    COMPLETED: "COMPLETED",
} as const;

export type BlockSalesStatus = (typeof BlockSalesStatus)[keyof typeof BlockSalesStatus];

export const BLOCK_SALES_STATUS_LABEL_KEYS: Record<BlockSalesStatus, string> = {
    UPCOMING: "blocks:salesStatus.upcoming",
    ON_SALE: "blocks:salesStatus.onSale",
    COMPLETED: "blocks:salesStatus.completed",
};

/** Units can be booked unless the block hasn't opened for sales yet. */
export function isBlockBookable(salesStatus: BlockSalesStatus | null | undefined) {
    return salesStatus !== BlockSalesStatus.UPCOMING;
}

/** "Q4 2027" etc. for an expected completion date (YYYY-MM-DD or ISO). */
export function completionQuarter(t: (key: string, options?: Record<string, unknown>) => string, date: string | null | undefined) {
    if (!date) return null;
    const [year, month] = date.slice(0, 10).split("-").map(Number);
    if (!year || !month) return null;
    return t("blocks:quarter", {quarter: Math.ceil(month / 3), year});
}
