import {createListCollection} from "@ark-ui/react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {DEAL_STATUS_LABEL_KEYS, DealStatus} from "@/features/deals/types/deal.types";
import {useTranslation} from "react-i18next";

const { t } = useTranslation("deals");

interface DealsFiltersProps {
    status?: DealStatus;
    onStatusChange(status: DealStatus | undefined): void;
}

const statusCollection = createListCollection({
    items: [
        { label: "All statuses", value: "ALL" },
        ...Object.values(DealStatus).map(
            (status) => ({
                label: t(DEAL_STATUS_LABEL_KEYS[status]),
                value: status
            })
        ),
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