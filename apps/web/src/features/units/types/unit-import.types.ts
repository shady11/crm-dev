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

export type ImportUnitRowError = {
    row: number;
    /** English, for API clients; the app shows `codes`. */
    messages: string[];
    codes: {code: ImportRowErrorCode; params?: Record<string, string | number>}[];
};

/** CA-7: an existing unit not on sale, whose price the file would have changed. */
export type ImportKeptPrice = {
    row: number;
    block: string;
    number: string;
    status: "RESERVED" | "SOLD" | "UNAVAILABLE" | "AVAILABLE";
    currentPrice: number;
    filePrice: number;
};

export type ImportUnitsResult = {
    created: number;
    pricesUpdated: number;
    pricesRequested: number;
    unchanged: number;
    keptPrices: ImportKeptPrice[];
    failed: number;
    errors: ImportUnitRowError[];
};

/** The columns an import file has, in the order the sample uses. */
export const IMPORT_FIELDS = ["block", "entrance", "floor", "number", "area", "price", "type", "rooms"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const OPTIONAL_IMPORT_FIELDS: ImportField[] = ["type", "rooms"];

/** A 400 for the file as a whole (columns not recognised or missing). */
export type ImportFileError = {
    code: "IMPORT_UNRECOGNISED_COLUMNS" | "IMPORT_MISSING_COLUMNS";
    missing: ImportField[];
    found: string[];
};
