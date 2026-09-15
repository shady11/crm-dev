import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Search} from "lucide-react";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {getUsers} from "@/features/users/api/users.api";
import {assignRoleToUser, getRoleUserIds, revokeRoleFromUser} from "../api/rbac.api";
import type {Role} from "../types/rbac.types";

/**
 * Who currently holds a given Role, with checkboxes to grant/revoke it.
 * Effective permissions change on the user's very next request — no
 * re-login required (see SessionValidationService.validate).
 */
export function RoleUsersDialog({role, onOpenChange}: {role: Role | null; onOpenChange(open: boolean): void}) {
    const {t} = useTranslation("rbac");
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");

    const usersQuery = useQuery({
        queryKey: ["users", {search, limit: 50}],
        queryFn: () => getUsers({search: search || undefined, limit: 50}),
        enabled: role !== null,
    });

    const roleId = role?.id;

    const assignmentsQuery = useQuery({
        queryKey: ["rbac", "role-user-ids", roleId],
        queryFn: async () => new Set(await getRoleUserIds(roleId!)),
        enabled: roleId !== undefined,
    });

    const toggle = useMutation({
        mutationFn: async ({userId, assign}: {userId: string; assign: boolean}) => {
            if (!roleId) return;
            if (assign) await assignRoleToUser(userId, roleId);
            else await revokeRoleFromUser(userId, roleId);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["rbac", "role-user-ids", roleId]});
            void queryClient.invalidateQueries({queryKey: ["rbac", "roles"]});
        },
        onError: () => toast.error(t("usersDialog.toasts.error")),
    });

    const assignedIds = assignmentsQuery.data ?? new Set<string>();

    return (
        <Dialog open={role !== null} onOpenChange={({open}) => onOpenChange(open)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("usersDialog.title", {name: role?.name})}</DialogTitle>
                    <DialogDescription>{t("usersDialog.description")}</DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-3">
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                        <Input
                            className="pl-8"
                            placeholder={t("usersDialog.searchPlaceholder")}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    {usersQuery.isLoading || assignmentsQuery.isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="max-h-80 space-y-1 overflow-y-auto">
                            {(usersQuery.data?.items ?? []).map((user) => (
                                <label
                                    key={user.id}
                                    className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                                >
                                    <Checkbox
                                        checked={assignedIds.has(user.id)}
                                        disabled={toggle.isPending}
                                        onCheckedChange={({checked}) =>
                                            toggle.mutate({userId: user.id, assign: checked === true})
                                        }
                                    />
                                    <span className="flex-1">{user.fullName}</span>
                                    <span className="text-muted-foreground text-xs">{user.email}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
