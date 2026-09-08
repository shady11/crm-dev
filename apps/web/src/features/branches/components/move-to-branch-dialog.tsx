import {useEffect, useState} from "react";
import {createListCollection} from "@ark-ui/react";
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
import {useBranchesFilter} from "../hooks/use-branches-filter";

type Props = {
    open: boolean;
    /** Name shown in the confirmation copy (the lead's or client's name). */
    entityName: string;
    /** The record's current branch, excluded from the picker. */
    currentBranchId: string | null;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onConfirm(branchId: string): void;
};

// BR-D1: COMPANY_ADMIN-only handoff of a lead or client to another branch.
// Shared between leads and clients — the shape is identical, only the API
// call differs, which the caller supplies via onConfirm.
export function MoveToBranchDialog({
    open,
    entityName,
    currentBranchId,
    isSubmitting,
    onOpenChange,
    onConfirm,
}: Props) {
    const {t} = useTranslation("branches");
    const {t: tCommon} = useTranslation("common");
    const [branchId, setBranchId] = useState("");
    const branches = useBranchesFilter();

    useEffect(() => {
        if (open) setBranchId("");
    }, [open]);

    const collection = createListCollection({
        items: branches.data
            .filter((branch) => branch.id !== currentBranchId)
            .map((branch) => ({label: branch.name, value: branch.id})),
    });

    return (
        <AlertDialog open={open} onOpenChange={({open: next}) => onOpenChange(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("moveDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("moveDialog.description", {name: entityName})}</AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogBody>
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("moveDialog.branchLabel")}</span>
                        <Select
                            collection={collection}
                            value={branchId ? [branchId] : []}
                            onValueChange={({value}) => setBranchId(value[0] ?? "")}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("select.placeholder")} />
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
                </AlertDialogBody>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction disabled={isSubmitting || !branchId} onClick={() => onConfirm(branchId)}>
                        {t("moveDialog.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
