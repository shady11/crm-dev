import {Plus, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Button} from "@/components/ui/button.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {USER_ROLE_LABEL_KEYS, type UserRole} from "@/features/users/types/user.types";
import type {RoleFilterValue, StatusFilter} from "@/features/users/hooks/use-users-list.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useTranslation} from "react-i18next";

interface UsersToolbarProps {
    statusFilter: StatusFilter;
    onStatusFilterChange(value: StatusFilter): void;
    roleFilter: RoleFilterValue;
    onRoleFilterChange(value: RoleFilterValue): void;
    visibleRoles: UserRole[];
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
                    label: t(USER_ROLE_LABEL_KEYS[role]),
                    value: role
                })
            ),
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{t("toolbar.heading")}</h2>

            <div className="flex flex-wrap items-center gap-2">
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

                <InputGroup className="w-56">
                    <InputGroupInput
                        placeholder={t("toolbar.placeholders.searchUsers")}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <InputGroupAddon>
                        <Search className="size-4" />
                    </InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddUser}>
                    <Plus className="size-3" />
                    {t("toolbar.addUser")}
                </Button>
            </div>
        </div>
    );
}