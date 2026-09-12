import {useState} from "react";

export type SortOrder = "asc" | "desc";

export interface SortState<TField extends string> {
    sortBy: TField | undefined;
    sortOrder: SortOrder | undefined;
}

// Shared sort-state for list-page tables: clicking an unsorted column sorts
// it ascending, clicking the active column flips direction, and clicking the
// descending column again clears the sort back to the table's default order.
export function useSort<TField extends string>(initial?: SortState<TField>) {
    const [sortBy, setSortBy] = useState<TField | undefined>(initial?.sortBy);
    const [sortOrder, setSortOrder] = useState<SortOrder | undefined>(initial?.sortOrder);

    const toggleSort = (field: TField) => {
        if (sortBy !== field) {
            setSortBy(field);
            setSortOrder("asc");
            return;
        }

        if (sortOrder === "asc") {
            setSortOrder("desc");
            return;
        }

        setSortBy(undefined);
        setSortOrder(undefined);
    };

    return {sortBy, sortOrder, toggleSort};
}
