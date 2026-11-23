import {roleLabel} from "@/features/rbac/utils/role-label.ts";
import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import type {RoleFilterValue, StatusFilter} from "@/features/users/hooks/use-users-list.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useTranslation} from "react-i18next";
import {FilterPopover} from "@/components/shared/filter-popover.tsx";

interface UsersToolbarProps {
    statusFilter: StatusFilter;
    onStatusFilterChange(value: StatusFilter): void;
    roleFilter: RoleFilterValue;
    onRoleFilterChange(value: RoleFilterValue): void;
    visibleRoles: {id: string; name: string}[];
    branchFilter: string | "all";
    onBranchFilterChange(value: string | "all"): void;
    search: string;
    onSearchChange(value: string): void;
    onAddUser(): void;
}

// statusCollection is built inside the component (not here at module scope)
// so its labels re-render when the active language changes.

export function UsersToolbar({
                                 statusFilter,
                                 onStatusFilterChange,
                                 roleFilter,
                                 onRoleFilterChange,
                                 visibleRoles,
                                 branchFilter,
                                 onBranchFilterChange,
                                 search,
                                 onSearchChange,
                                 onAddUser,
                             }: UsersToolbarProps) {
    const { t } = useTranslation("users");

    const statusCollection = createListCollection({
        items: [
            { label: t("status.active"), value: "active" },
            { label: t("status.inactive"), value: "inactive" },
        ],
    });

    const roleCollection = createListCollection({
        items: [
            { label: t("toolbar.placeholders.filterByRole"), value: "all" },
            ...visibleRoles.map(
                (role) => ({
                    label: roleLabel(t, role.name),
                    value: role.id
                })
            ),
        ],
    });

    // Dropdown filters in the panel that differ from their default.
    const activeFilterCount = [branchFilter, statusFilter, roleFilter].filter((value) => value !== "all").length;
    const resetFilters = () => {
        onBranchFilterChange("all");
        onStatusFilterChange("all");
        onRoleFilterChange("all");
    };

    return (
        // Search on the left, filters and actions on the right, as on every list.
        <div className="flex flex-wrap items-center justify-between gap-3">
            <InputGroup className="w-full sm:w-80">
                <InputGroupInput
                    placeholder={t("toolbar.placeholders.searchUsers")}
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
                        collection={statusCollection}
                        value={[statusFilter]}
                        onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as StatusFilter)}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t("toolbar.placeholders.filterByStatus")} />
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
                            <SelectValue placeholder={t("toolbar.placeholders.filterByRole")} />
                        </SelectTrigger>
                        <SelectContent>
                            {roleCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterPopover>

                <Button onClick={onAddUser}>
                    <Plus className="size-3" />
                    {t("toolbar.addUser")}
                </Button>
            </div>
        </div>
    );
}