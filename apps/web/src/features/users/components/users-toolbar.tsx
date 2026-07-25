import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {USER_ROLE_LABELS, type UserRole} from "@/features/users/types/user.types";
import type {RoleFilterValue, StatusFilter} from "@/features/users/hooks/use-users-list.ts";

interface UsersToolbarProps {
    statusFilter: StatusFilter;
    onStatusFilterChange(value: StatusFilter): void;
    roleFilter: RoleFilterValue;
    onRoleFilterChange(value: RoleFilterValue): void;
    visibleRoles: UserRole[];
    search: string;
    onSearchChange(value: string): void;
    onAddUser(): void;
}

const statusCollection = createListCollection({
    items: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
    ],
});

export function UsersToolbar({
                                 statusFilter,
                                 onStatusFilterChange,
                                 roleFilter,
                                 onRoleFilterChange,
                                 visibleRoles,
                                 search,
                                 onSearchChange,
                                 onAddUser,
                             }: UsersToolbarProps) {
    const roleCollection = createListCollection({
        items: [
            { label: "Filter by role", value: "all" },
            ...visibleRoles.map((role) => ({ label: USER_ROLE_LABELS[role], value: role })),
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">All Users</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Select
                    collection={statusCollection}
                    value={[statusFilter]}
                    onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as StatusFilter)}
                >
                    <SelectTrigger className="w-40">
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

                <Select
                    collection={roleCollection}
                    value={[roleFilter]}
                    onValueChange={({ value }) => onRoleFilterChange((value[0] ?? "all") as RoleFilterValue)}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roleCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <InputGroup className="w-56">
                    <InputGroupInput
                        placeholder="Search for users..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <InputGroupAddon>
                        <Search className="size-4" />
                    </InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddUser}>
                    <Plus className="size-3" />
                    Add New User
                </Button>
            </div>
        </div>
    );
}