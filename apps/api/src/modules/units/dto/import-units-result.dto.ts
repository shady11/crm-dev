export type ImportUnitRowError = {
    row: number;
    messages: string[];
};

export type ImportUnitsResult = {
    created: number;
    failed: number;
    errors: ImportUnitRowError[];
};
