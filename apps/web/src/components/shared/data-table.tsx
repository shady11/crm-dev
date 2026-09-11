import type {ReactNode} from "react";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table} from "@/components/ui/table.tsx";

interface DataTableProps {
    isLoading: boolean;
    isEmpty: boolean;
    emptyIcon: ReactNode;
    emptyTitle: string;
    emptyDescription: string;
    children: ReactNode;
}

// Shared loading/empty/table-wrapper shell reused by every list-page table
// (clients, leads, deals, users, tasks, ...) so they only need to define
// their own columns and rows via <TableHeader>/<TableBody> children.
export function DataTable({isLoading, isEmpty, emptyIcon, emptyTitle, emptyDescription, children}: DataTableProps) {
    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-secondary">
                <Spinner className="size-6" />
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

    return (
        <div className="rounded-lg border border-secondary">
            <Table>{children}</Table>
        </div>
    );
}
