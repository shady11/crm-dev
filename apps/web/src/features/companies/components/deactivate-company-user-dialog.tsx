import {useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {TriangleAlert} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
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
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {apiErrorMessage} from "@/lib/api-error.ts";
import {deactivateCompanyUser, getDeactivationPreview} from "../api/companies.api";
import type {CompanyUser} from "../types/company.types";

const NO_HANDOVER = "__none__";

/**
 * SA-7: deactivating a company's user from the platform, like a company
 * admin does it (CA-8): their open leads, deals and tasks can go to someone
 * on the same branch first, and the last person who can manage the
 * company's users needs an explicit confirmation.
 */
export function DeactivateCompanyUserDialog({
    companyId,
    user,
    users,
    onClose,
    onDone,
}: {
    companyId: string;
    user: CompanyUser | null;
    users: CompanyUser[];
    onClose(): void;
    onDone(user: CompanyUser): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const [reassignToId, setReassignToId] = useState(NO_HANDOVER);
    const [confirmLastAdmin, setConfirmLastAdmin] = useState(false);

    const preview = useQuery({
        queryKey: ["company-user-deactivation", companyId, user?.id],
        queryFn: () => getDeactivationPreview(companyId, user!.id),
        enabled: Boolean(user),
    });

    const deactivate = useMutation({
        mutationFn: () =>
            deactivateCompanyUser(companyId, user!.id, {
                ...(reassignToId !== NO_HANDOVER ? {reassignToId} : {}),
                ...(confirmLastAdmin ? {confirmLastAdmin: true} : {}),
            }),
        onSuccess: () => {
            const done = user!;
            reset();
            onDone(done);
        },
    });

    const reset = () => {
        setReassignToId(NO_HANDOVER);
        setConfirmLastAdmin(false);
        deactivate.reset();
    };

    // The handover only takes someone active on the same branch.
    const branchId = user?.branch?.id ?? null;
    const candidates = users.filter(
        (other) => other.id !== user?.id && other.isActive && (other.branch?.id ?? null) === branchId,
    );
    const collection = createListCollection({
        items: [
            {label: t("detail.usersCard.deactivate.noHandover"), value: NO_HANDOVER},
            ...candidates.map((other) => ({label: `${other.fullName} · ${other.role.name}`, value: other.id})),
        ],
    });

    const data = preview.data;
    const hasWork = !!data && data.leads + data.deals + data.tasks > 0;
    const blocked = !data || deactivate.isPending || (data.isLastAdmin && !confirmLastAdmin);

    return (
        <AlertDialog
            open={user !== null}
            onOpenChange={({open}) => {
                if (!open) {
                    reset();
                    onClose();
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("detail.usersCard.confirmDialog.deactivate.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium">{user?.fullName}</span> —{" "}
                        {t("detail.usersCard.confirmDialog.deactivate.body")}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 px-6 pb-2 text-sm">
                    {preview.isLoading || !data ? (
                        <Spinner className="size-4" />
                    ) : (
                        <>
                            <p className="text-muted-foreground">
                                {hasWork
                                    ? t("detail.usersCard.deactivate.openWork", {
                                          leads: data.leads,
                                          deals: data.deals,
                                          tasks: data.tasks,
                                      })
                                    : t("detail.usersCard.deactivate.noOpenWork")}
                            </p>

                            {hasWork ? (
                                <div className="space-y-1.5">
                                    <span className="font-medium">{t("detail.usersCard.deactivate.handTo")}</span>
                                    <Select
                                        collection={collection}
                                        value={[reassignToId]}
                                        onValueChange={({value}) => setReassignToId(value[0] ?? NO_HANDOVER)}
                                    >
                                        <SelectTrigger aria-label={t("detail.usersCard.deactivate.handTo")}>
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
                                    {reassignToId === NO_HANDOVER ? (
                                        <p className="text-muted-foreground text-xs">
                                            {t("detail.usersCard.deactivate.noHandoverHint")}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {data.isLastAdmin ? (
                                <Alert variant="warning">
                                    <TriangleAlert />
                                    <AlertTitle>{t("detail.usersCard.deactivate.lastAdminTitle")}</AlertTitle>
                                    <AlertDescription>
                                        <p>{t("detail.usersCard.deactivate.lastAdminBody")}</p>
                                        <label className="mt-2 flex items-center gap-2">
                                            <Checkbox
                                                checked={confirmLastAdmin}
                                                onCheckedChange={({checked}) => setConfirmLastAdmin(checked === true)}
                                            />
                                            <span>{t("detail.usersCard.deactivate.lastAdminConfirm")}</span>
                                        </label>
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            {deactivate.isError ? (
                                <Alert variant="destructive">
                                    <TriangleAlert />
                                    <AlertTitle>{apiErrorMessage(deactivate.error) ?? t("detail.usersCard.toasts.actionError")}</AlertTitle>
                                </Alert>
                            ) : null}
                        </>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deactivate.isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <Button
                        variant="destructive"
                        disabled={blocked}
                        isLoading={deactivate.isPending}
                        onClick={() => deactivate.mutate()}
                    >
                        {reassignToId !== NO_HANDOVER
                            ? t("detail.usersCard.deactivate.confirmWithHandover")
                            : t("detail.usersCard.confirmDialog.deactivate.confirm")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
