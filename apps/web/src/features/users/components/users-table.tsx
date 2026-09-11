import {ArrowLeftRight, Pen, Trash2, UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {SortableTableHead} from "@/components/shared/sortable-table-head.tsx";
import {UserStatusDot} from "@/features/users/components/user-status-dot.tsx";
import {isBranchScopedRole, type User, USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types";
import type {UserSortField} from "@/features/users/api/users.api.ts";
import {formatCreatedAt, initials} from "@/features/users/utils/format.ts";
import {useTranslation} from "react-i18next";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface UsersTableProps {
    users: User[];
    isLoading: boolean;
    sortBy: UserSortField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: UserSortField): void;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onEdit(user: User): void;
    onDelete(user: User): void;
    isDeleting(id: string): boolean;
    onTransferBranch(user: User): void;
}

export function UsersTable({
                               users,
                               isLoading,
                               sortBy,
                               sortOrder,
                               onSort,
                               selectedIds,
                               allSelected,
                               onToggleAll,
                               onToggleOne,
                               onEdit,
                               onDelete,
                               isDeleting,
                               onTransferBranch,
                           }: UsersTableProps) {
    const { t, i18n } = useTranslation("users");

    return (
        <DataTable
            isLoading={isLoading}
            isEmpty={users.length === 0}
            emptyIcon={<UsersRoundIcon strokeWidth={1.25} />}
            emptyTitle={t("table.empty.title")}
            emptyDescription={t("table.empty.description")}
            cards={users.map((user) => {
                const created = formatCreatedAt(user.createdAt, i18n.language);

                return (
                    <div key={user.id} className="rounded-lg border border-secondary p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={selectedIds.has(user.id)}
                                    onCheckedChange={(details) => onToggleOne(user.id, details.checked === true)}
                                />
                                <Avatar className="size-9">
                                    <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{user.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <UserStatusDot isActive={user.isActive} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{t(USER_ROLE_LABEL_KEYS[user.role])}</span>
                            <span>{user.branch?.name ?? "—"}</span>
                            <span>{created.date}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(user)} aria-label={t("common:actions.edit")}>
                                <Pen className="size-3.5" />
                            </Button>
                            {isBranchScopedRole(user.role) && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("card.transferBranch")}
                                    onClick={() => onTransferBranch(user)}
                                >
                                    <ArrowLeftRight className="size-3.5" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={!user.isActive || isDeleting(user.id)}
                                onClick={() => onDelete(user)}
                                aria-label={t("common:actions.delete")}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                );
            })}
        >
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={(details) => onToggleAll(details.checked === true)}
                        />
                    </TableHead>
                    <TableHead>{t("table.headers.userId")}</TableHead>
                    <SortableTableHead field="fullName" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.headers.name")}
                    </SortableTableHead>
                    <SortableTableHead field="role" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.headers.role")}
                    </SortableTableHead>
                    <TableHead>{t("table.headers.branch")}</TableHead>
                    <SortableTableHead field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.headers.created")}
                    </SortableTableHead>
                    <TableHead>{t("table.headers.status")}</TableHead>
                    <TableHead className="text-right">{t("table.headers.actions")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => {
                    const created = formatCreatedAt(user.createdAt, i18n.language);

                    return (
                        <TableRow key={user.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedIds.has(user.id)}
                                    onCheckedChange={(details) => onToggleOne(user.id, details.checked === true)}
                                />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                #{user.id.slice(0, 4).toUpperCase()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{t(USER_ROLE_LABEL_KEYS[user.role])}</TableCell>
                            <TableCell className="text-muted-foreground">{user.branch?.name ?? "—"}</TableCell>
                            <TableCell>
                                <p>{created.date}</p>
                                <p className="text-xs text-muted-foreground">{created.time}</p>
                            </TableCell>
                            <TableCell>
                                <UserStatusDot isActive={user.isActive} />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(user)} aria-label={t("common:actions.edit")}>
                                        <Pen className="size-3.5" />
                                    </Button>
                                    {isBranchScopedRole(user.role) && (
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={t("card.transferBranch")}
                                            onClick={() => onTransferBranch(user)}
                                        >
                                            <ArrowLeftRight className="size-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={!user.isActive || isDeleting(user.id)}
                                        onClick={() => onDelete(user)}
                                        aria-label={t("common:actions.delete")}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </DataTable>
    );
}