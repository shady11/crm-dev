import {useState, type ReactNode} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "@/components/ui/toast.tsx";
import {apiErrorMessage} from "@/lib/api-error.ts";
import {
    type CreateCompanyPayload,
    deleteCompany,
    restoreCompany,
    resumeCompany,
    suspendCompany,
    updateCompany,
} from "../api/companies.api";
import type {Company} from "../types/company.types";
import {CompanyFormSheet} from "../components/company-form-sheet";
import {DeleteCompanyDialog} from "../components/delete-company-dialog";
import {CompanyConfirmDialog, type PendingCompanyAction} from "../components/company-confirm-dialog";
import {companyFormError} from "../utils/company-form-error";

export type CompanyAction = "edit" | PendingCompanyAction["action"];

type Pending = PendingCompanyAction | null;

/**
 * SA-12: editing, suspending, resuming, deleting and restoring a company,
 * shared by the companies list and a company's own page, so both offer the
 * same actions with the same confirmations. `request` opens the right
 * dialog; `dialogs` has to be rendered once on the page.
 */
export function useCompanyActions({onDeleted}: {onDeleted?(company: Company): void} = {}) {
    const {t} = useTranslation("companies");
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState<Company | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const refresh = () => queryClient.invalidateQueries({queryKey: ["companies"]});

    const save = useMutation<Company, Error, CreateCompanyPayload>({
        mutationFn: (payload) => updateCompany(editing!.id, payload),
        onSuccess: () => {
            void refresh();
            setEditing(null);
            toast.success({title: t("page.toasts.updateSuccess")});
        },
    });

    const act = useMutation<unknown, Error, NonNullable<Pending> & {reason?: string}>({
        mutationFn: ({action, company, reason}) =>
            action === "suspend"
                ? suspendCompany(company.id, reason)
                : action === "resume"
                  ? resumeCompany(company.id)
                  : action === "restore"
                    ? restoreCompany(company.id)
                    : deleteCompany(company.id),
        onSuccess: (_result, {action, company}) => {
            if (action === "delete") {
                // Not the deleted company itself: its page is about to close,
                // and fetching it again would only 404.
                void queryClient.invalidateQueries({
                    queryKey: ["companies"],
                    predicate: (query) => query.queryKey[1] !== company.id,
                });
            } else {
                void refresh();
            }
            setPending(null);
            toast.success({
                title: action === "suspend"
                    ? t("page.toasts.suspended", {name: company.name})
                    : action === "resume"
                      ? t("page.toasts.resumed", {name: company.name})
                      : action === "restore"
                        ? t("page.toasts.restored", {name: company.name})
                        : t("page.toasts.deleted", {name: company.name}),
            });
            if (action === "delete") onDeleted?.(company);
        },
        onError: (error) =>
            toast.error({title: t("page.toasts.actionError"), description: apiErrorMessage(error)}),
    });

    const request = (action: CompanyAction, company: Company) => {
        if (action === "edit") setEditing(company);
        else setPending({action, company});
    };

    const dialogs: ReactNode = (
        <>
            <CompanyFormSheet
                open={editing !== null}
                company={editing}
                isSubmitting={save.isPending}
                formError={save.error ? companyFormError(save.error, t, true) : undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditing(null);
                        // The next time the form opens, it starts without the old error.
                        save.reset();
                    }
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <DeleteCompanyDialog
                company={pending?.action === "delete" ? pending.company : null}
                isPending={act.isPending}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && act.mutate(pending)}
            />

            <CompanyConfirmDialog
                pending={pending?.action === "delete" ? null : pending}
                isPending={act.isPending}
                onCancel={() => setPending(null)}
                onConfirm={(reason) => pending && act.mutate({...pending, reason})}
            />
        </>
    );

    return {request, dialogs};
}
