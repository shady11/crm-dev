import {Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DEAL_STATUS_LABEL_KEYS, DealStatus} from "@/features/deals/types/deal.types";
import type {DealStatusFilter} from "@/features/deals/hooks/use-deals-list.ts";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {useTranslation} from "react-i18next";

const { t } = useTranslation("deals");

interface DealsToolbarProps {
    statusFilter: DealStatusFilter;
    onStatusFilterChange(value: DealStatusFilter): void;
    projectId?: string;
    onProjectIdChange(value: string | undefined): void;
    managerId?: string;
    onManagerIdChange(value: string | undefined): void;
    search: string;
    onSearchChange(value: string): void;
}

const statusCollection = createListCollection({
    items: [
        { label: "All statuses", value: "all" },
        ...Object.values(DealStatus).map(
            (status) => ({
                label: t(DEAL_STATUS_LABEL_KEYS[status]), value: status
            })
        ),
    ],
});

export function DealsToolbar({ statusFilter, onStatusFilterChange, projectId, onProjectIdChange, managerId, onManagerIdChange, search, onSearchChange }: DealsToolbarProps) {
    const projects = useProjectsFilter();
    const managers = useManagers();

    const projectCollection = createListCollection({
        items: [{ label: "All projects", value: "all" }, ...projects.data.map((p) => ({ label: p.name, value: p.id }))],
    });
    const managerCollection = createListCollection({
        items: [{ label: "All managers", value: "all" }, ...managers.data.map((m) => ({ label: m.fullName, value: m.id }))],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">All Deals</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Select
                    collection={projectCollection}
                    value={[projectId ?? "all"]}
                    onValueChange={({ value }) => onProjectIdChange(value[0] === "all" ? undefined : value[0])}
                >
                    <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
                    <SelectContent>
                        {projectCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select
                    collection={managerCollection}
                    value={[managerId ?? "all"]}
                    onValueChange={({ value }) => onManagerIdChange(value[0] === "all" ? undefined : value[0])}
                >
                    <SelectTrigger className="w-44"><SelectValue placeholder="Manager" /></SelectTrigger>
                    <SelectContent>
                        {managerCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select
                    collection={statusCollection}
                    value={[statusFilter]}
                    onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as DealStatusFilter)}
                >
                    <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                        {statusCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>

                <InputGroup className="w-64">
                    <InputGroupInput placeholder="Search by client, phone, unit..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
                    <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
}