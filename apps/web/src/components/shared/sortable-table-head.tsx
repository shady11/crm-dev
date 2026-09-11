import type {ReactNode} from "react";
import {ArrowDown, ArrowUp, ChevronsUpDown} from "lucide-react";
import {TableHead} from "@/components/ui/table.tsx";
import {cn} from "@/lib/utils.ts";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface SortableTableHeadProps<TField extends string> {
    field: TField;
    sortBy: TField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: TField): void;
    children: ReactNode;
    className?: string;
}

// A <TableHead> that acts as a sort control for its column — only columns a
// table opts into (by passing them through this component instead of a
// plain TableHead) are sortable.
export function SortableTableHead<TField extends string>({
    field,
    sortBy,
    sortOrder,
    onSort,
    children,
    className,
}: SortableTableHeadProps<TField>) {
    const isActive = sortBy === field;
    const Icon = isActive ? (sortOrder === "desc" ? ArrowDown : ArrowUp) : ChevronsUpDown;

    return (
        <TableHead className={className}>
            <button
                type="button"
                onClick={() => onSort(field)}
                className={cn(
                    "inline-flex items-center gap-1 hover:text-foreground",
                    isActive && "text-foreground",
                )}
            >
                {children}
                <Icon className={cn("size-3.5", !isActive && "opacity-50")} />
            </button>
        </TableHead>
    );
}
