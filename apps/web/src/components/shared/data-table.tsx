import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Table} from "@/components/ui/table.tsx";

const SKELETON_ROWS = 6;

interface DataTableProps {
    isLoading: boolean;
    isEmpty: boolean;
    emptyIcon: ReactNode;
    emptyTitle: string;
    emptyDescription: string;
    children: ReactNode;
    // Optional per-row card markup shown below the `md` breakpoint instead
    // of the table, which just grows a horizontal scrollbar on narrow
    // screens. Omit for tables with few enough columns to stay readable.
    cards?: ReactNode;
}

// Shared loading/empty/table-wrapper shell reused by every list-page table
// (clients, leads, deals, users, tasks, ...) so they only need to define
// their own columns and rows via <TableHeader>/<TableBody> children.
export function DataTable({isLoading, isEmpty, emptyIcon, emptyTitle, emptyDescription, children, cards}: DataTableProps) {
    const { t } = useTranslation("common");

    if (isLoading) {
        return (
            <div className="rounded-lg border border-secondary p-4">
                <div className="flex flex-col gap-3" role="status" aria-label={t("labels.loading")}>
                    {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
                    <EmptyTitle>{emptyTitle}</EmptyTitle>
                    <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    if (!cards) {
        return (
            <div className="rounded-lg border border-secondary">
                <Table>{children}</Table>
            </div>
        );
    }

    return (
        <>
            <div className="hidden rounded-lg border border-secondary md:block">
                <Table>{children}</Table>
            </div>
            <div className="grid grid-cols-1 gap-3 md:hidden">{cards}</div>
        </>
    );
}
