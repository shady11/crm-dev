import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Lock, Plus, ShieldCheck, Trash2, Users as UsersIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
    createRole,
    deleteRole,
    getPermissions,
    getRoles,
    setRolePermissions,
    updateRole,
} from "../api/rbac.api";
import type {Role} from "../types/rbac.types";
import {RoleFormSheet, type RoleFormValues} from "../components/role-form-sheet";
import {RoleUsersDialog} from "../components/role-users-dialog";

type Pending = {action: "delete"; role: Role} | null;

export function RolesPermissionsPage() {
    const {t} = useTranslation("rbac");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const [pending, setPending] = useState<Pending>(null);
    const [usersDialogRole, setUsersDialogRole] = useState<Role | null>(null);

    const rolesQuery = useQuery({queryKey: ["rbac", "roles"], queryFn: getRoles});
    const permissionsQuery = useQuery({queryKey: ["rbac", "permissions"], queryFn: getPermissions});

    const refresh = () => queryClient.invalidateQueries({queryKey: ["rbac", "roles"]});

    const save = useMutation({
        mutationFn: async (values: RoleFormValues) => {
            if (editing) {
                if (values.name !== editing.name || values.description !== (editing.description ?? "")) {
                    await updateRole(editing.id, {name: values.name, description: values.description});
                }
                return setRolePermissions(editing.id, values.permissionKeys);
            }

            return createRole({
                name: values.name,
                description: values.description || undefined,
                permissionKeys: values.permissionKeys,
            });
        },
        onSuccess: () => {
            void refresh();
            setFormOpen(false);
            setEditing(null);
            toast.success(editing ? t("toasts.updateSuccess") : t("toasts.createSuccess"));
        },
        onError: () => toast.error(editing ? t("toasts.updateError") : t("toasts.createError")),
    });

    const remove = useMutation({
        mutationFn: (role: Role) => deleteRole(role.id),
        onSuccess: () => {
            void refresh();
            setPending(null);
            toast.success(t("toasts.deleteSuccess"));
        },
        onError: () => {
            setPending(null);
            toast.error(t("toasts.deleteError"));
        },
    });

    const roles = rolesQuery.data ?? [];
    const permissions = permissionsQuery.data ?? [];
    const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                    <p className="text-sm text-muted-foreground">{t("page.description")}</p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    {t("page.newRole")}
                </Button>
            </div>

            {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("page.table.headers.name")}</TableHead>
                                <TableHead>{t("page.table.headers.type")}</TableHead>
                                <TableHead>{t("page.table.headers.permissions")}</TableHead>
                                <TableHead>{t("page.table.headers.users")}</TableHead>
                                <TableHead className="w-0" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell>
                                        <div className="font-medium">{role.name}</div>
                                        {role.description ? (
                                            <div className="text-muted-foreground text-xs">{role.description}</div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={role.isSystem ? "outline" : "secondary"} className="gap-1">
                                            {role.isSystem ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}
                                            {role.isSystem ? t("badges.system") : t("badges.custom")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {t("page.table.permissionCount", {count: role.permissionKeys.length})}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <button
                                            className="hover:text-foreground hover:underline"
                                            onClick={() => setUsersDialogRole(role)}
                                        >
                                            {t("page.table.userCount", {count: role.userCount})}
                                        </button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label={t("page.rowActions.manageUsers", {name: role.name})}
                                                onClick={() => setUsersDialogRole(role)}
                                            >
                                                <UsersIcon className="size-3.5" />
                                            </Button>
                                            {!role.isSystem && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditing(role);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        {tCommon("actions.edit")}
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        aria-label={t("page.rowActions.delete", {name: role.name})}
                                                        onClick={() => setPending({action: "delete", role})}
                                                    >
                                                        <Trash2 className="text-destructive size-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RoleFormSheet
                open={formOpen}
                role={editing}
                permissions={permissions}
                isSubmitting={save.isPending}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                onSubmit={(values) => save.mutate(values)}
            />

            <RoleUsersDialog role={usersDialogRole} onOpenChange={(open) => !open && setUsersDialogRole(null)} />

            <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDialog.delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending ? (
                                <>
                                    <span className="font-medium">{pending.role.name}</span> —{" "}
                                    {t("confirmDialog.delete.body")}
                                </>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={remove.isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={remove.isPending}
                            onClick={() => pending && remove.mutate(pending.role)}
                        >
                            {remove.isPending ? t("confirmDialog.working") : t("confirmDialog.delete.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
