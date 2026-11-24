import {roleLabel} from "@/features/rbac/utils/role-label.ts";
import {useTranslation} from "react-i18next";
import {EllipsisVertical, FolderCog} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback, AvatarGroupCount} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Menu, MenuContent, MenuItem, MenuTrigger} from "@/components/ui/menu.tsx";
import {initials} from "@/features/users/utils/format";
import type {Role} from "../types/rbac.types";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

// Cycled by card position so an arbitrary, growing list of roles (system +
// however many a tenant has created) still reads as a varied grid rather
// than a wall of one color.
const ICON_COLORS = [
    "bg-blue-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
];

export function RoleCard({
    role,
    colorIndex,
    onManageUsers,
    onEdit,
    onDelete,
    onCopy,
}: {
    role: Role;
    colorIndex: number;
    onManageUsers(): void;
    onEdit(): void;
    onDelete(): void;
    /** CA-2: make an editable company copy. */
    onCopy(): void;
}) {
    const {t} = useTranslation("rbac");
    const {t: tCommon} = useTranslation("common");
    const {user} = useAuth();

    // A global role (companyId null) can only be managed by a platform
    // administrator — see RbacService.assertCanManageRole and
    // RoleFormSheet's matching `readOnly` check.
    // SA-10: nobody manages the platform administrator's own role; its
    // access comes from the account.
    const canManage = !role.isPlatformRole && (role.companyId !== null || Boolean(user?.isSuperAdmin));
    // A built-in role's holders, seen by the platform admin, are every
    // company's users together.
    const countsAllCompanies = role.companyId === null && !role.isPlatformRole && Boolean(user?.isSuperAdmin);

    const shown = role.sample.slice(0, 4);
    const extra = role.userCount - shown.length;

    return (
        // Full height of its grid row, with members and the button pinned to the bottom, so
        // cards line up however long the role name is.
        <Card className="h-full border">
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={`icon-tile flex size-7 shrink-0 items-center justify-center ${ICON_COLORS[colorIndex % ICON_COLORS.length]}`}>
                            <FolderCog size={16} strokeWidth={2} />
                        </div>
                        <h3 className="font-medium">{roleLabel(t, role.name)}</h3>
                    </div>

                    <Menu>
                        <MenuTrigger asChild>
                            <Button size="icon-xs" variant="ghost" aria-label={tCommon("actions.moreActions")}>
                                <EllipsisVertical className="size-3.5" />
                            </Button>
                        </MenuTrigger>
                        <MenuContent className="w-44">
                            <MenuItem value="users" onClick={onManageUsers}>
                                {t("page.rowActions.manageUsers", {name: roleLabel(t, role.name)})}
                            </MenuItem>
                            {!role.isPlatformRole && (
                                <MenuItem value="copy" onClick={onCopy}>
                                    {t("page.rowActions.copy")}
                                </MenuItem>
                            )}
                            {canManage && (
                                <>
                                    <MenuItem value="edit" onClick={onEdit}>
                                        {tCommon("actions.edit")}
                                    </MenuItem>
                                    <MenuItem value="delete" variant="destructive" onClick={onDelete}>
                                        {tCommon("actions.delete")}
                                    </MenuItem>
                                </>
                            )}
                        </MenuContent>
                    </Menu>
                </div>

                <div className="mt-auto flex items-center gap-2">
                    {/* A 4px overlap keeps both initials visible on a 24px avatar (CA-11). */}
                    <div className="flex -space-x-1">
                        {shown.map((user) => (
                            <Avatar key={user.id} size="sm" className="border-2 border-background">
                                <AvatarFallback className="text-[10px]">{initials(user.fullName)}</AvatarFallback>
                            </Avatar>
                        ))}
                        {extra > 0 && (
                            <AvatarGroupCount className="size-6 border-2 border-background text-[12px] font-medium">
                                +{extra}
                            </AvatarGroupCount>
                        )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {countsAllCompanies
                            ? t("page.table.userCountAllCompanies", {count: role.userCount})
                            : t("page.table.userCount", {count: role.userCount})}
                    </span>
                </div>

                <Button variant="outline" className="w-full" onClick={onEdit}>
                    {canManage ? t("page.card.editRole") : t("page.card.view")}
                </Button>
            </CardContent>
        </Card>
    );
}
