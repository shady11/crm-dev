import {Pen, Trash2, UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {UserStatusDot} from "@/features/users/components/user-status-dot.tsx";
import {type User, USER_ROLE_LABELS} from "@/features/users/types/user.types";
import {formatCreatedAt, initials} from "@/features/users/utils/format.ts";

interface UsersTableProps {
    users: User[];
    isLoading: boolean;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onEdit(user: User): void;
    onDelete(id: string): void;
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
                    <EmptyTitle>No users found</EmptyTitle>
                    <EmptyDescription>Try adjusting your filters or search.</EmptyDescription>
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
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => {
                        const created = formatCreatedAt(user.createdAt);

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
                                <TableCell>{USER_ROLE_LABELS[user.role]}</TableCell>
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
                                            onClick={() => onDelete(user.id)}
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