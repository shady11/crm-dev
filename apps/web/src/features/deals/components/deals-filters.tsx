import {createListCollection} from "@ark-ui/react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {DEAL_STATUS_LABEL_KEYS, DealStatus} from "@/features/deals/types/deal.types";
import {useTranslation} from "react-i18next";

interface DealsFiltersProps {
    status?: DealStatus;
    onStatusChange(status: DealStatus | undefined): void;
}

export function DealsFilters({ status, onStatusChange }: DealsFiltersProps) {
    const { t } = useTranslation("deals");

    const statusCollection = createListCollection({
        items: [
            { label: t("toolbar.allStatuses"), value: "ALL" },
            ...Object.values(DealStatus).map(
                (s) => ({
                    label: t(DEAL_STATUS_LABEL_KEYS[s]),
                    value: s
                })
            ),
        ],
    });

    return (
        <div className="flex items-center gap-3">
            <Select
                collection={statusCollection}
                value={[status ?? "ALL"]}
                onValueChange={(item) => onStatusChange(item.value[0] === "ALL" ? undefined : (item.value[0] as DealStatus))}
            >
                <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("toolbar.statusPlaceholder")} />
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