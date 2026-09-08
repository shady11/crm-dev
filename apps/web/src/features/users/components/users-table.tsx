import {Pen, Trash2, UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {UserStatusDot} from "@/features/users/components/user-status-dot.tsx";
import {type User, USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types";
import {formatCreatedAt, initials} from "@/features/users/utils/format.ts";
import {useTranslation} from "react-i18next";

interface UsersTableProps {
    users: User[];
    isLoading: boolean;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onEdit(user: User): void;
    onDelete(user: User): void;
    isDeleting(id: string): boolean;
}

export function UsersTable({
                               users,
                               isLoading,
                               selectedIds,
                               allSelected,
                               onToggleAll,
                               onToggleOne,
                               onEdit,
                               onDelete,
                               isDeleting,
                           }: UsersTableProps) {
    const { t, i18n } = useTranslation("users");

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-secondary">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <UsersRoundIcon strokeWidth={1.25} />
                    </EmptyMedia>
                    <EmptyTitle>{t("table.empty.title")}</EmptyTitle>
                    <EmptyDescription>{t("table.empty.description")}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="rounded-lg border border-secondary">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={(details) => onToggleAll(details.checked === true)}
                            />
                        </TableHead>
                        <TableHead>{t("table.headers.userId")}</TableHead>
                        <TableHead>{t("table.headers.name")}</TableHead>
                        <TableHead>{t("table.headers.role")}</TableHead>
                        <TableHead>{t("table.headers.created")}</TableHead>
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
                                <TableCell>
                                    <p>{created.date}</p>
                                    <p className="text-xs text-muted-foreground">{created.time}</p>
                                </TableCell>
                                <TableCell>
                                    <UserStatusDot isActive={user.isActive} />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(user)}>
                                            <Pen className="size-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={!user.isActive || isDeleting(user.id)}
                                            onClick={() => onDelete(user)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}