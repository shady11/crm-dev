import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {ClientForm} from "@/features/clients/components/client-form.tsx";
import type {CreateClientPayload, UpdateClientPayload} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";

interface ClientFormSheetProps {
    open: boolean;
    client: Client | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: CreateClientPayload | UpdateClientPayload): void;
}

export function ClientFormSheet({ open, client, isSubmitting, hasError, onClose, onSubmit }: ClientFormSheetProps) {
    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{client ? "Edit client" : "Add client"}</SheetTitle>
                    <SheetDescription>
                        {client ? "Update the client's details." : "Add a new client record."}
                    </SheetDescription>
                </SheetHeader>
                <ClientForm
                    key={`${client?.id ?? "create-client"}-${open ? "open" : "closed"}`}
                    client={client}
                    errorMessage={
                        hasError ? "Client could not be saved. Check the details and try again." : undefined
                    }
                    isSubmitting={isSubmitting}
                    submitLabel={client ? "Save changes" : "Create client"}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}