import {useEffect, useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {getDeactivationImpact} from "@/features/users/api/users.api.ts";
import {useAssignableUsers} from "@/features/users/hooks/use-assignable-users.ts";
import type {User} from "@/features/users/types/user.types.ts";

const NO_REASSIGN = "__none__";

type Props = {
    user: User | null;
    open: boolean;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onConfirm(reassignToId?: string): void;
};

export function DeactivateUserDialog({user, open, isSubmitting, onOpenChange, onConfirm}: Props) {
    const {t} = useTranslation("users");
    const {t: tCommon} = useTranslation("common");
    const [reassignToId, setReassignToId] = useState(NO_REASSIGN);

    const impactQuery = useQuery({
        queryKey: ["users", user?.id, "deactivation-impact"],
        queryFn: () => getDeactivationImpact(user!.id),
        enabled: open && !!user,
    });

    const assignable = useAssignableUsers();

    useEffect(() => {
        if (open) setReassignToId(NO_REASSIGN);
    }, [open, user?.id]);

    if (!user) return null;

    const openLeads = impactQuery.data?.openLeads ?? 0;
    const activeDeals = impactQuery.data?.activeDeals ?? 0;
    const hasImpact = openLeads + activeDeals > 0;

    const candidates = assignable.data.filter((candidate) => candidate.id !== user.id && candidate.isActive);

    const collection = createListCollection({
        items: [
            {label: t("card.deactivateDialog.noReassignOption"), value: NO_REASSIGN},
            ...candidates.map((candidate) => ({label: candidate.fullName, value: candidate.id})),
        ],
    });

    return (
        <AlertDialog open={open} onOpenChange={({open: next}) => onOpenChange(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("card.deactivateDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("card.deactivateDialog.description", {name: user.fullName})}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogBody>
                    {impactQuery.isLoading ? (
                        <div className="flex justify-center py-4">
                            <Spinner className="size-5" />
                        </div>
                    ) : hasImpact ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {t("card.deactivateDialog.impact", {name: user.fullName, openLeads, activeDeals})}
                            </p>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("card.deactivateDialog.reassignLabel")}</span>
                                <Select
                                    collection={collection}
                                    value={[reassignToId]}
                                    onValueChange={({value}) => setReassignToId(value[0] ?? NO_REASSIGN)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {collection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                        </div>
                    ) : null}
                </AlertDialogBody>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={isSubmitting || impactQuery.isLoading}
                        onClick={() => onConfirm(reassignToId === NO_REASSIGN ? undefined : reassignToId)}
                    >
                        {t("card.deactivateDialog.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
