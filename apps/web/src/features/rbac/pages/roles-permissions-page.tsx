import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
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
import {RoleCard} from "../components/role-card";

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
                    <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                    <p className="text-muted-foreground text-sm">{t("page.breadcrumb")}</p>
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role, index) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            colorIndex={index}
                            onManageUsers={() => setUsersDialogRole(role)}
                            onEdit={() => {
                                setEditing(role);
                                setFormOpen(true);
                            }}
                            onDelete={() => setPending({action: "delete", role})}
                        />
                    ))}
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
