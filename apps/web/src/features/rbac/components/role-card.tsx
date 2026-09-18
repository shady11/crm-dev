import {useTranslation} from "react-i18next";
import {EllipsisVertical, FolderCog, Lock} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback, AvatarGroupCount} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
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
}: {
    role: Role;
    colorIndex: number;
    onManageUsers(): void;
    onEdit(): void;
    onDelete(): void;
}) {
    const {t} = useTranslation("rbac");
    const {t: tCommon} = useTranslation("common");
    const {user} = useAuth();

    // A global role (companyId null) can only be managed by a platform
    // administrator — see RbacService.assertCanManageRole and
    // RoleFormSheet's matching `readOnly` check.
    const canManage = role.companyId !== null || Boolean(user?.isSuperAdmin);

    const shown = role.sample.slice(0, 4);
    const extra = role.userCount - shown.length;

    return (
        <Card className="border border-secondary shadow-none">
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 text-white ${ICON_COLORS[colorIndex % ICON_COLORS.length]}`}>
                            <FolderCog size={20} strokeWidth={1.75} />
                        </div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium">{role.name}</h3>
                            {role.isSystem && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                    <Lock className="size-3" />
                                    {t("badges.system")}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <Menu>
                        <MenuTrigger asChild>
                            <Button size="icon-xs" variant="ghost" aria-label={tCommon("actions.moreActions")}>
                                <EllipsisVertical className="size-3.5" />
                            </Button>
                        </MenuTrigger>
                        <MenuContent className="w-44">
                            <MenuItem value="users" onClick={onManageUsers}>
                                {t("page.rowActions.manageUsers", {name: role.name})}
                            </MenuItem>
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

                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
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
                        {t("page.table.userCount", {count: role.userCount})}
                    </span>
                </div>

                <Button variant="outline" className="w-full" onClick={onEdit}>
                    {canManage ? t("page.card.editRole") : t("page.card.view")}
                </Button>
            </CardContent>
        </Card>
    );
}
