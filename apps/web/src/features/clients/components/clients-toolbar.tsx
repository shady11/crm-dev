import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import type {ProjectFilterValue} from "@/features/clients/hooks/use-clients-list.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useTranslation} from "react-i18next";

interface ClientsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    projectFilter: ProjectFilterValue;
    onProjectFilterChange(value: ProjectFilterValue): void;
    branchFilter: string | "all";
    onBranchFilterChange(value: string | "all"): void;
    onAddClient(): void;
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

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{t("page.title")}</h2>

            <div className="flex flex-wrap items-center gap-2">
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

                <Button onClick={onAddClient}>
                    <Plus className="size-3" />
                    {t("toolbar.addClient")}
                </Button>
            </div>
        </div>
    );
}