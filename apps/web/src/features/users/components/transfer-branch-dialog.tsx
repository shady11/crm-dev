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
import {getBranchTransferImpact} from "@/features/users/api/users.api.ts";
import {useAssignableUsers} from "@/features/users/hooks/use-assignable-users.ts";
import {useBranchesFilter} from "@/features/branches/hooks/use-branches-filter";
import type {User} from "@/features/users/types/user.types.ts";

const NO_REASSIGN = "__none__";

type Props = {
    user: User | null;
    open: boolean;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onConfirm(branchId: string, reassignToId?: string): void;
};

// BR-A3: mirrors DeactivateUserDialog's shape — an impact preview plus an
// opt-in reassignment step, so a branch transfer never silently orphans the
// user's open pipeline.
export function TransferBranchDialog({user, open, isSubmitting, onOpenChange, onConfirm}: Props) {
    const {t} = useTranslation("users");
    const {t: tCommon} = useTranslation("common");
    const {t: tBranches} = useTranslation("branches");
    const [branchId, setBranchId] = useState("");
    const [reassignToId, setReassignToId] = useState(NO_REASSIGN);

    const impactQuery = useQuery({
        queryKey: ["users", user?.id, "branch-transfer-impact"],
        queryFn: () => getBranchTransferImpact(user!.id),
        enabled: open && !!user,
    });

    const branches = useBranchesFilter();
    const assignable = useAssignableUsers();

    useEffect(() => {
        if (open) {
            setBranchId("");
            setReassignToId(NO_REASSIGN);
        }
    }, [open, user?.id]);

    if (!user) return null;

    const openLeads = impactQuery.data?.openLeads ?? 0;
    const activeDeals = impactQuery.data?.activeDeals ?? 0;
    const hasImpact = openLeads + activeDeals > 0;

    const branchCollection = createListCollection({
        items: branches.data
            .filter((branch) => branch.id !== user.branchId)
            .map((branch) => ({label: branch.name, value: branch.id})),
    });

    const candidates = assignable.data.filter(
        (candidate) => candidate.id !== user.id && candidate.isActive,
    );
    const reassignCollection = createListCollection({
        items: [
            {label: t("card.transferBranchDialog.noReassignOption"), value: NO_REASSIGN},
            ...candidates.map((candidate) => ({label: candidate.fullName, value: candidate.id})),
        ],
    });

    return (
        <AlertDialog open={open} onOpenChange={({open: next}) => onOpenChange(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("card.transferBranchDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("card.transferBranchDialog.description", {name: user.fullName})}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogBody className="space-y-4">
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("card.transferBranchDialog.branchLabel")}</span>
                        <Select
                            collection={branchCollection}
                            value={branchId ? [branchId] : []}
                            onValueChange={({value}) => setBranchId(value[0] ?? "")}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={tBranches("select.placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {branchCollection.items.map((item) => (
                                    <SelectItem key={item.value} item={item}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>

                    {impactQuery.isLoading ? (
                        <div className="flex justify-center py-4">
                            <Spinner className="size-5" />
                        </div>
                    ) : hasImpact ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {t("card.transferBranchDialog.impact", {name: user.fullName, openLeads, activeDeals})}
                            </p>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">
                                    {t("card.transferBranchDialog.reassignLabel")}
                                </span>
                                <Select
                                    collection={reassignCollection}
                                    value={[reassignToId]}
                                    onValueChange={({value}) => setReassignToId(value[0] ?? NO_REASSIGN)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {reassignCollection.items.map((item) => (
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
                        disabled={isSubmitting || impactQuery.isLoading || !branchId}
                        onClick={() =>
                            onConfirm(branchId, reassignToId === NO_REASSIGN ? undefined : reassignToId)
                        }
                    >
                        {t("card.transferBranchDialog.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
