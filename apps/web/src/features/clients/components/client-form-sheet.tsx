import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {ClientForm} from "@/features/clients/components/client-form.tsx";
import type {CreateClientPayload, UpdateClientPayload} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";
import {useTranslation} from "react-i18next";

interface ClientFormSheetProps {
    open: boolean;
    client: Client | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: CreateClientPayload | UpdateClientPayload): void;
}

export function ClientFormSheet({ open, client, isSubmitting, hasError, onClose, onSubmit }: ClientFormSheetProps) {
    const { t } = useTranslation("clients");

    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{client ? t("form.editTitle") : t("form.addTitle")}</SheetTitle>
                    <SheetDescription>
                        {client ? t("form.editDescription") : t("form.addDescription")}
                    </SheetDescription>
                </SheetHeader>
                <ClientForm
                    key={`${client?.id ?? "create-client"}-${open ? "open" : "closed"}`}
                    client={client}
                    errorMessage={hasError ? t("form.saveError") : undefined}
                    isSubmitting={isSubmitting}
                    submitLabel={client ? t("form.saveChanges") : t("form.create")}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}