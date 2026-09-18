import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
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
import {Input} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {getRoleMembers} from "../api/rbac.api";
import type {Role} from "../types/rbac.types";

/**
 * Read-only: who currently holds a given Role. Each user has exactly one
 * role, so moving them elsewhere happens from the Users page, not here.
 */
export function RoleUsersDialog({role, onOpenChange}: {role: Role | null; onOpenChange(open: boolean): void}) {
    const {t} = useTranslation("rbac");
    const [search, setSearch] = useState("");

    const roleId = role?.id;

    const membersQuery = useQuery({
        queryKey: ["rbac", "role-members", roleId],
        queryFn: () => getRoleMembers(roleId!),
        enabled: roleId !== undefined,
    });

    const members = membersQuery.data ?? [];
    const filteredMembers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return members;
        return members.filter(
            (member) => member.fullName.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
        );
    }, [members, search]);

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

                    {membersQuery.isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Spinner />
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">{t("usersDialog.empty")}</p>
                    ) : (
                        <div className="max-h-80 space-y-1 overflow-y-auto">
                            {filteredMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                                >
                                    <span className="flex-1">{member.fullName}</span>
                                    <span className="text-muted-foreground text-xs">{member.email}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
