import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {LEAD_STATUS_LABELS, LeadStatus} from "@/features/leads/types/lead.types.ts";
import type {LeadStatusFilterValue} from "@/features/leads/hooks/use-leads-list.ts";

interface LeadsToolbarProps {
    search: string;
    onSearchChange(value: string): void;
    statusFilter: LeadStatusFilterValue;
    onStatusFilterChange(value: LeadStatusFilterValue): void;
    onAddLead(): void;
}

export function LeadsToolbar({
                                  search,
                                  onSearchChange,
                                  statusFilter,
                                  onStatusFilterChange,
                                  onAddLead,
                              }: LeadsToolbarProps) {
    const statusCollection = createListCollection({
        items: [
            { label: "Filter by status", value: "all" },
            ...Object.values(LeadStatus).map((status) => ({ label: LEAD_STATUS_LABELS[status], value: status })),
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">All Leads</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Select
                    collection={statusCollection}
                    value={[statusFilter]}
                    onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as LeadStatusFilterValue)}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
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
                        placeholder="Search for leads..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <InputGroupAddon>
                        <Search className="size-4" />
                    </InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddLead}>
                    <Plus className="size-3" />
                    Add New Lead
                </Button>
            </div>
        </div>
    );
}
