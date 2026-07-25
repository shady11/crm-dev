import {useState} from "react";
import {Mail, Pen, Phone, Trash2, UserRound} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Status} from "@/components/ui/status.tsx";
import {Item, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item";
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
import {type User, USER_ROLE_BADGE_CLASSES, USER_ROLE_LABELS} from "@/features/users/types/user.types.ts";

type Props = {
    user: User;
    onEdit?: (user: User) => void;
    onDelete?: (user: User) => void;
    isDeleting?: boolean;
};

export function UserCard({ user, onEdit, onDelete, isDeleting }: Props) {
    const [deactivateOpen, setDeactivateOpen] = useState(false);

    return (
        <>
            <Item variant="default" className="border border-secondary p-4">
                <div className="flex w-full flex-col gap-4">
                    <div className="flex w-full items-center gap-4">
                        <ItemMedia variant="icon">
                            <UserRound className="size-10" strokeWidth={1} />
                        </ItemMedia>
                        <ItemContent className="gap-0">
                            <div className="flex items-center gap-2">
                                <ItemTitle className="text-lg">{user.fullName}</ItemTitle>
                                {!user.isActive && <Status size="sm" variant="default" className="bg-gray-400" />}
                            </div>
                            <ItemDescription className="flex items-center gap-1 text-xs">
                                <Mail className="size-3" />
                                {user.email}
                            </ItemDescription>
                            {user.phone && (
                                <ItemDescription className="flex items-center gap-1 text-xs">
                                    <Phone className="size-3" />
                                    {user.phone}
                                </ItemDescription>
                            )}
                        </ItemContent>
                        <Badge variant="default" className={USER_ROLE_BADGE_CLASSES[user.role]}>
                            {USER_ROLE_LABELS[user.role]}
                        </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit?.(user)}>
                            <Pen className="size-3" />
                            Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeactivateOpen(true)}>
                            <Trash2 className="size-3" />
                            Deactivate
                        </Button>
                    </div>
                </div>
            </Item>

            <AlertDialog open={deactivateOpen} onOpenChange={({ open }) => setDeactivateOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deactivate "{user.fullName}" and revoke their access. This can be reversed
                            later by an admin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => {
                                onDelete?.(user);
                                setDeactivateOpen(false);
                            }}
                        >
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}