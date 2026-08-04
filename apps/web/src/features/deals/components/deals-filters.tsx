import {createListCollection} from "@ark-ui/react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {DEAL_STATUS_LABELS, DealStatus} from "@/features/deals/types/deal.types";

interface DealsFiltersProps {
    status?: DealStatus;
    onStatusChange(status: DealStatus | undefined): void;
}

const statusCollection = createListCollection({
    items: [
        { label: "All statuses", value: "ALL" },
        ...Object.values(DealStatus).map((status) => ({ label: DEAL_STATUS_LABELS[status], value: status })),
    ],
});

export function DealsFilters({ status, onStatusChange }: DealsFiltersProps) {
    return (
        <div className="flex items-center gap-3">
            <Select
                collection={statusCollection}
                value={[status ?? "ALL"]}
                onValueChange={(item) => onStatusChange(item.value[0] === "ALL" ? undefined : (item.value[0] as DealStatus))}
            >
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    {statusCollection.items.map((item) => (
                        <SelectItem key={item.value} item={item}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}