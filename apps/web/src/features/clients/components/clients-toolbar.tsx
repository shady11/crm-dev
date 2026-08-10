import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import type {ProjectFilterValue} from "@/features/clients/hooks/use-clients-list.ts";

interface ClientsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    projectFilter: ProjectFilterValue;
    onProjectFilterChange(value: ProjectFilterValue): void;
    onAddClient(): void;
}

export function ClientsToolbar({
                                   search,
                                   onSearchChange,
                                   projectFilter,
                                   onProjectFilterChange,
                                   onAddClient,
                               }: ClientsToolbarProps) {
    const { data: projects } = useProjectsFilter();

    const projectCollection = createListCollection({
        items: [
            { label: "Filter by project", value: "all" },
            ...projects.map((project) => ({ label: project.name, value: project.id })),
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">All Clients</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Select
                    collection={projectCollection}
                    value={[projectFilter]}
                    onValueChange={({ value }) => onProjectFilterChange((value[0] ?? "all") as ProjectFilterValue)}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by project" />
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
                        placeholder="Search for clients..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <InputGroupAddon>
                        <Search className="size-4" />
                    </InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddClient}>
                    <Plus className="size-3" />
                    Add New Client
                </Button>
            </div>
        </div>
    );
}