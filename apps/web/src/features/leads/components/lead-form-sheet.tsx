import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {LeadForm} from "@/features/leads/components/lead-form.tsx";
import type {CreateLeadPayload, Lead, UpdateLeadPayload} from "@/features/leads/api/leads.api.ts";

interface LeadFormSheetProps {
    open: boolean;
    lead: Lead | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: CreateLeadPayload | UpdateLeadPayload): void;
}

export function LeadFormSheet({ open, lead, isSubmitting, hasError, onClose, onSubmit }: LeadFormSheetProps) {
    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{lead ? "Edit lead" : "Add lead"}</SheetTitle>
                    <SheetDescription>
                        {lead ? "Update the lead's details." : "Add a new lead record."}
                    </SheetDescription>
                </SheetHeader>
                <LeadForm
                    key={`${lead?.id ?? "create-lead"}-${open ? "open" : "closed"}`}
                    lead={lead}
                    errorMessage={
                        hasError ? "Lead could not be saved. Check the details and try again." : undefined
                    }
                    isSubmitting={isSubmitting}
                    submitLabel={lead ? "Save changes" : "Create lead"}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}
