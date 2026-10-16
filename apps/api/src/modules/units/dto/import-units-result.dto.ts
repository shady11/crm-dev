/**
 * A problem with one row. `messages` is English, for API clients; `codes`
 * is what the web app shows, in the reader's language.
 */
export type ImportUnitRowError = {
    row: number;
    messages: string[];
    codes: {code: ImportRowErrorCode; params?: Record<string, string | number>}[];
};

export type ImportRowErrorCode =
    | "blockRequired"
    | "entranceRequired"
    | "floorInvalid"
    | "numberRequired"
    | "areaInvalid"
    | "priceInvalid"
    | "typeInvalid"
    | "roomsInvalid"
    | "priceNotAllowed"
    | "duplicateInFile"
    | "rowFailed";

/** CA-7: an existing unit whose new price was not applied because it isn't on sale. */
export type ImportKeptPrice = {
    row: number;
    block: string;
    number: string;
    status: string;
    currentPrice: number;
    filePrice: number;
};

export type ImportUnitsResult = {
    created: number;
    /** Existing units whose new price was applied (the importer approves prices). */
    pricesUpdated: number;
    /** Existing units whose new price now waits for an approver. */
    pricesRequested: number;
    /** Existing units the file left as they were. */
    unchanged: number;
    /** Reserved, sold or withdrawn units: their price stays. */
    keptPrices: ImportKeptPrice[];
    failed: number;
    errors: ImportUnitRowError[];
};
