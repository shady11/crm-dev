import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {getCompany} from "../api/companies.api";
import type {Company} from "../types/company.types";

const COUNTS = ["users", "projects", "units", "clients", "leads", "deals"] as const;

/**
 * SA-3: deleting a company says what it holds and asks for its name, so the
 * wrong row can't go in one click. Only offered for a suspended company
 * (the API refuses otherwise); the company can be restored from "Deleted".
 */
export function DeleteCompanyDialog({
    company,
    isPending,
    onCancel,
    onConfirm,
}: {
    company: Company | null;
    isPending: boolean;
    onCancel(): void;
    onConfirm(): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const [typed, setTyped] = useState("");

    const details = useQuery({
        // Its own key, so refreshing the list after the delete does not
        // re-fetch the company that was just deleted.
        queryKey: ["company-delete-preview", company?.id],
        queryFn: () => getCompany(company!.id),
        enabled: Boolean(company),
    });

    const matches = !!company && typed.trim().toLocaleLowerCase() === company.name.trim().toLocaleLowerCase();

    const close = () => {
        setTyped("");
        onCancel();
    };

    return (
        <AlertDialog open={company !== null} onOpenChange={({open}) => !open && close()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirmDialog.delete.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium">{company?.name}</span> — {t("confirmDialog.delete.body")}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 px-6 pb-2 text-sm">
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground">{t("confirmDialog.delete.holds")}</p>
                        {details.isLoading ? (
                            <Spinner className="size-4" />
                        ) : details.data ? (
                            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                                {COUNTS.map((key) => (
                                    <li key={key} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">{t(`detail.stats.${key}`)}</span>
                                        <span className="font-medium tabular-nums">{details.data.stats[key]}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    <label className="block space-y-1.5">
                        <span>{t("confirmDialog.delete.typeName", {name: company?.name ?? ""})}</span>
                        <Input
                            value={typed}
                            onChange={(event) => setTyped(event.target.value)}
                            placeholder={company?.name}
                            aria-label={t("confirmDialog.delete.typeName", {name: company?.name ?? ""})}
                            autoComplete="off"
                        />
                    </label>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending} onClick={close}>
                        {tCommon("actions.cancel")}
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        disabled={!matches || isPending}
                        isLoading={isPending}
                        onClick={() => {
                            setTyped("");
                            onConfirm();
                        }}
                    >
                        {t("confirmDialog.delete.confirm")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
