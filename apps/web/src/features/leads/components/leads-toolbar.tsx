import {Search, UserRoundIcon} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Toggle} from "@/components/ui/toggle.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {LEAD_LOST_REASON_LABEL_KEYS, LEAD_STATUS_LABEL_KEYS, LeadLostReason, LeadStatus} from "@/features/leads/types/lead.types.ts";
import type {LeadStatusFilterValue} from "@/features/leads/hooks/use-leads-list.ts";
import {LEAD_SOURCES} from "@/features/leads/utils/sources.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {useTranslation} from "react-i18next";

interface LeadsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    statusFilter: LeadStatusFilterValue;
    onStatusFilterChange(value: LeadStatusFilterValue): void;
    lostReasonFilter: LeadLostReason | "all";
    onLostReasonFilterChange(value: LeadLostReason | "all"): void;
    branchFilter: string | "all";
    onBranchFilterChange(value: string | "all"): void;
    sourceFilter: string | "all";
    onSourceFilterChange(value: string | "all"): void;
    managerFilter: string | "all";
    onManagerFilterChange(value: string | "all"): void;
    mineOnly: boolean;
    onMineOnlyChange(value: boolean): void;
}

export function LeadsToolbar({
                                  search,
                                  onSearchChange,
                                  statusFilter,
                                  onStatusFilterChange,
                                  lostReasonFilter,
                                  onLostReasonFilterChange,
                                  branchFilter,
                                  onBranchFilterChange,
                                  sourceFilter,
                                  onSourceFilterChange,
                                  managerFilter,
                                  onManagerFilterChange,
                                  mineOnly,
                                  onMineOnlyChange,
                              }: LeadsToolbarProps) {
    const { t } = useTranslation("leads");
    const managers = useManagers();

    const statusCollection = createListCollection({
        items: [
            { label: t("toolbar.filterByStatus"), value: "all" },
            { label: t("toolbar.openStatuses"), value: "OPEN" },
            { label: t("toolbar.followUpOverdue"), value: "FOLLOW_UP_OVERDUE" },
            ...Object.values(LeadStatus).map(
                (status) => ({
                    label: t(LEAD_STATUS_LABEL_KEYS[status]),
                    value: status
                })
            ),
        ],
    });

    const lostReasonCollection = createListCollection({
        items: [
            { label: t("toolbar.allLostReasons"), value: "all" },
            ...Object.values(LeadLostReason).map((reason) => ({ label: t(LEAD_LOST_REASON_LABEL_KEYS[reason]), value: reason as string })),
        ],
    });

    const managerCollection = createListCollection({
        items: [
            { label: t("toolbar.allManagers"), value: "all" },
            ...managers.data.map((m) => ({ label: m.fullName, value: m.id })),
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
                    collection={managerCollection}
                    value={[managerFilter]}
                    onValueChange={({ value }) => onManagerFilterChange(value[0] ?? "all")}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder={t("toolbar.allManagers")} />
                    </SelectTrigger>
                    <SelectContent>
                        {managerCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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

                {statusFilter === LeadStatus.LOST && (
                    <Select
                        collection={lostReasonCollection}
                        value={[lostReasonFilter]}
                        onValueChange={({ value }) => onLostReasonFilterChange((value[0] ?? "all") as LeadLostReason | "all")}
                    >
                        <SelectTrigger className="w-48" aria-label={t("toolbar.lostReason")}>
                            <SelectValue placeholder={t("toolbar.allLostReasons")} />
                        </SelectTrigger>
                        <SelectContent>
                            {lostReasonCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

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
            </div>
        </div>
    );
}
