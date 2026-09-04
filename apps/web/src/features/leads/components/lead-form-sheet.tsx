import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {LeadForm} from "@/features/leads/components/lead-form.tsx";
import type {CreateLeadPayload, Lead, UpdateLeadPayload} from "@/features/leads/api/leads.api.ts";
import {useTranslation} from "react-i18next";

interface LeadFormSheetProps {
    open: boolean;
    lead: Lead | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: CreateLeadPayload | UpdateLeadPayload): void;
}

export function LeadFormSheet({ open, lead, isSubmitting, hasError, onClose, onSubmit }: LeadFormSheetProps) {
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
