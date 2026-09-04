import {createListCollection} from "@ark-ui/react";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useTranslation} from "react-i18next";

interface ClientsPaginationProps {
    page: number;
    limit: number;
    total: number;
    onPageChange(page: number): void;
    onLimitChange(limit: number): void;
}

const rowsCollection = createListCollection({
    items: [
        { label: "10", value: "10" },
        { label: "20", value: "20" },
        { label: "50", value: "50" },
    ],
});

export function ClientsPagination({ page, limit, total, onPageChange, onLimitChange }: ClientsPaginationProps) {
    const { t } = useTranslation("clients");

    if (total === 0) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("pagination.rowsPerPage")}</span>
                <Select
                    collection={rowsCollection}
                    value={[String(limit)]}
                    onValueChange={({ value }) => onLimitChange(Number(value[0]) || 10)}
                >
                    <SelectTrigger className="w-20">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {rowsCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Pagination
                className="flex-1 justify-end"
                count={total}
                pageSize={limit}
                page={page}
                siblingCount={1}
                onPageChange={(details) => onPageChange(details.page)}
            >
                <PaginationPrevious />
                <PaginationItems />
                <PaginationNext />
            </Pagination>
        </div>
    );
}