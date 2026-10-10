import {Plus, Search, UserRoundIcon} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Toggle} from "@/components/ui/toggle.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {LEAD_STATUS_LABEL_KEYS, LeadStatus} from "@/features/leads/types/lead.types.ts";
import type {LeadStatusFilterValue} from "@/features/leads/hooks/use-leads-list.ts";
import {LEAD_SOURCES} from "@/features/leads/utils/sources.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useTranslation} from "react-i18next";

interface LeadsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    statusFilter: LeadStatusFilterValue;
    onStatusFilterChange(value: LeadStatusFilterValue): void;
    branchFilter: string | "all";
    onBranchFilterChange(value: string | "all"): void;
    sourceFilter: string | "all";
    onSourceFilterChange(value: string | "all"): void;
    mineOnly: boolean;
    onMineOnlyChange(value: boolean): void;
    onAddLead(): void;
}

export function LeadsToolbar({
                                  search,
                                  onSearchChange,
                                  statusFilter,
                                  onStatusFilterChange,
                                  branchFilter,
                                  onBranchFilterChange,
                                  sourceFilter,
                                  onSourceFilterChange,
                                  mineOnly,
                                  onMineOnlyChange,
                                  onAddLead,
                              }: LeadsToolbarProps) {
    const { t } = useTranslation("leads");

    const statusCollection = createListCollection({
        items: [
            { label: t("toolbar.filterByStatus"), value: "all" },
            ...Object.values(LeadStatus).map(
                (status) => ({
                    label: t(LEAD_STATUS_LABEL_KEYS[status]),
                    value: status
                })
            ),
        ],
    });

    const sourceCollection = createListCollection({
        items: [
            { label: t("toolbar.allSources"), value: "all" },
            ...LEAD_SOURCES.map((source) => ({ label: t(`sources.${source}`), value: source })),
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{t("toolbar.heading")}</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Toggle
                    variant="outline"
                    size="lg"
                    pressed={mineOnly}
                    onPressedChange={onMineOnlyChange}
                >
                    <UserRoundIcon className="size-4" />
                    {t("toolbar.mineOnly")}
                </Toggle>

                <BranchFilterSelect value={branchFilter} onChange={onBranchFilterChange} />

                <Select
                    collection={sourceCollection}
                    value={[sourceFilter]}
                    onValueChange={({ value }) => onSourceFilterChange(value[0] ?? "all")}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder={t("toolbar.allSources")} />
                    </SelectTrigger>
                    <SelectContent>
                        {sourceCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    collection={statusCollection}
                    value={[statusFilter]}
                    onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as LeadStatusFilterValue)}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t("toolbar.filterByStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                        {statusCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <InputGroup className="w-56">
                    <InputGroupInput
                        placeholder={t("toolbar.searchPlaceholder")}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <InputGroupAddon>
                        <Search className="size-4" />
                    </InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddLead}>
                    <Plus className="size-3" />
                    {t("toolbar.addLead")}
                </Button>
            </div>
        </div>
    );
}
