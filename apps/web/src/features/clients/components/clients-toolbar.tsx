import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import type {ProjectFilterValue} from "@/features/clients/hooks/use-clients-list.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useTranslation} from "react-i18next";
import {FilterPopover} from "@/components/shared/filter-popover.tsx";

interface ClientsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    projectFilter: ProjectFilterValue;
    onProjectFilterChange(value: ProjectFilterValue): void;
    branchFilter: string | "all";
    onBranchFilterChange(value: string | "all"): void;
    /** Omitted when the user can't create clients, which hides the button. */
    onAddClient?(): void;
}

export function ClientsToolbar({
                                   search,
                                   onSearchChange,
                                   projectFilter,
                                   onProjectFilterChange,
                                   branchFilter,
                                   onBranchFilterChange,
                                   onAddClient,
                               }: ClientsToolbarProps) {
    const { t } = useTranslation("clients");
    const { data: projects } = useProjectsFilter();

    const projectCollection = createListCollection({
        items: [
            { label: t("toolbar.filterByProject"), value: "all" },
            ...projects.map((project) => ({ label: project.name, value: project.id })),
        ],
    });

    // Dropdown filters in the panel that differ from their default.
    const activeFilterCount = [branchFilter, projectFilter].filter((value) => value !== "all").length;
    const resetFilters = () => {
        onBranchFilterChange("all");
        onProjectFilterChange("all");
    };

    return (
        // No heading here: the page title above already says "Clients".
        // Search on the left, filters and the add button on the right.
        <div className="flex flex-wrap items-center justify-between gap-3">
            <InputGroup className="w-full sm:w-80">
                <InputGroupInput
                    placeholder={t("toolbar.searchPlaceholder")}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <InputGroupAddon>
                    <Search className="size-4" />
                </InputGroupAddon>
            </InputGroup>

            <div className="flex flex-wrap items-center gap-2">
                <FilterPopover activeCount={activeFilterCount} onReset={resetFilters}>
                    <BranchFilterSelect value={branchFilter} onChange={onBranchFilterChange} />

                    <Select
                        collection={projectCollection}
                        value={[projectFilter]}
                        onValueChange={({ value }) => onProjectFilterChange((value[0] ?? "all") as ProjectFilterValue)}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t("toolbar.filterByProject")} />
                        </SelectTrigger>
                        <SelectContent>
                            {projectCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterPopover>

                {onAddClient && (
                    <Button onClick={onAddClient}>
                        <Plus className="size-3" />
                        {t("toolbar.addClient")}
                    </Button>
                )}
            </div>
        </div>
    );
}