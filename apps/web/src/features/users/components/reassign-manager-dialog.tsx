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
import {useTeamManagers} from "@/features/users/hooks/use-team-managers.ts";

type Props = {
    open: boolean;
    /** Name shown in the confirmation copy (the lead's or deal's identifying label). */
    entityName: string;
    /** The record's branch — the manager picker is scoped to it. */
    branchId: string | null;
    /** The record's current manager, excluded from the picker. */
    currentManagerId?: string | null;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onConfirm(managerId: string): void;
};

// SH-A1: a SALES_HEAD moving a lead or deal from one of their team's
// SALES_MANAGERs to another. Shared between leads and deals — the shape is
// identical, only the API call differs, which the caller supplies via
// onConfirm.
export function ReassignManagerDialog({
    open,
    entityName,
    branchId,
    currentManagerId,
    isSubmitting,
    onOpenChange,
    onConfirm,
}: Props) {
    const {t} = useTranslation("users");
    const {t: tCommon} = useTranslation("common");
    const [managerId, setManagerId] = useState("");
    const managers = useTeamManagers(branchId);

    useEffect(() => {
        if (open) setManagerId("");
    }, [open]);

    const candidates = managers.data.filter((candidate) => candidate.id !== currentManagerId);

    const collection = createListCollection({
        items: candidates.map((candidate) => ({label: candidate.fullName, value: candidate.id})),
    });

    return (
        <AlertDialog open={open} onOpenChange={({open: next}) => onOpenChange(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("reassignDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("reassignDialog.description", {name: entityName})}</AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogBody>
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("reassignDialog.managerLabel")}</span>
                        <Select
                            collection={collection}
                            value={managerId ? [managerId] : []}
                            onValueChange={({value}) => setManagerId(value[0] ?? "")}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("reassignDialog.placeholder")} />
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
                    <AlertDialogAction disabled={isSubmitting || !managerId} onClick={() => onConfirm(managerId)}>
                        {t("reassignDialog.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
