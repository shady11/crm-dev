import {TriangleAlert} from "lucide-react";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LeadForm} from "@/features/leads/components/lead-form.tsx";
import type {
    ClientDuplicateMatch,
    CreateLeadPayload,
    Lead,
    LeadDuplicateMatch,
    UpdateLeadPayload,
} from "@/features/leads/api/leads.api.ts";
import {useTranslation} from "react-i18next";

interface LeadFormSheetProps {
    open: boolean;
    lead: Lead | null;
    isSubmitting: boolean;
    hasError: boolean;
    duplicateWarning: { leads: LeadDuplicateMatch[]; clients: ClientDuplicateMatch[] } | null;
    onConfirmDuplicate(): void;
    onDismissDuplicate(): void;
    onClose(): void;
    onSubmit(payload: CreateLeadPayload | UpdateLeadPayload): void;
}

export function LeadFormSheet({
    open,
    lead,
    isSubmitting,
    hasError,
    duplicateWarning,
    onConfirmDuplicate,
    onDismissDuplicate,
    onClose,
    onSubmit,
}: LeadFormSheetProps) {
    const { t } = useTranslation("leads");

    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{lead ? t("form.editTitle") : t("form.addTitle")}</SheetTitle>
                    <SheetDescription>
                        {lead ? t("form.editDescription") : t("form.addDescription")}
                    </SheetDescription>
                </SheetHeader>
                {duplicateWarning && (
                    <Alert variant="warning" className="mx-4 mt-2">
                        <TriangleAlert />
                        <AlertTitle>{t("form.duplicateWarningTitle")}</AlertTitle>
                        <AlertDescription>
                            <p>
                                {t("form.duplicateWarningDescription", {
                                    count: duplicateWarning.leads.length + duplicateWarning.clients.length,
                                })}
                            </p>
                            <div className="mt-3 flex gap-2">
                                <Button type="button" size="sm" variant="secondary" onClick={onDismissDuplicate}>
                                    {t("form.duplicateWarningEdit")}
                                </Button>
                                <Button type="button" size="sm" onClick={onConfirmDuplicate} disabled={isSubmitting}>
                                    {t("form.duplicateWarningConfirm")}
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
                <LeadForm
                    key={`${lead?.id ?? "create-lead"}-${open ? "open" : "closed"}`}
                    lead={lead}
                    errorMessage={
                        hasError ? t("form.saveError") : undefined
                    }
                    isSubmitting={isSubmitting}
                    submitLabel={lead ? t("form.saveChanges") : t("form.create")}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}
