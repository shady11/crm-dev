import {useEffect, useState} from "react";
import {TriangleAlert, UserPlusIcon} from "lucide-react";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {ClientCard} from "@/features/clients/components/client-card.tsx";
import {ClientSearch} from "@/features/clients/components/client-search.tsx";
import type {Client} from "@/features/clients/types/client.types.ts";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {initials} from "@/features/leads/utils/format.ts";
import {useTranslation} from "react-i18next";

type ConvertMode = "new" | "existing";

interface ConvertLeadDialogProps {
    lead: Lead | null;
    isSubmitting?: boolean;
    errorMessage?: string;
    onClose(): void;
    onConfirm(payload: { clientId?: string }): void;
}

export function ConvertLeadDialog({ lead, isSubmitting = false, errorMessage, onClose, onConfirm }: ConvertLeadDialogProps) {
    const { t } = useTranslation("leads");
    const [mode, setMode] = useState<ConvertMode>("new");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    useEffect(() => {
        setMode("new");
        setSelectedClient(null);
    }, [lead?.id]);

    const handleConfirm = () => {
        if (mode === "existing" && selectedClient) {
            onConfirm({ clientId: selectedClient.id });
            return;
        }
        onConfirm({});
    };

    return (
        <Dialog open={!!lead} onOpenChange={({ open }) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("convertDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {lead ? t("convertDialog.descriptionNamed", { name: lead.fullName }) : t("convertDialog.descriptionGeneric")}
                    </DialogDescription>
                </DialogHeader>

                <DialogBody>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`flex-1 rounded-md border border-secondary p-2 text-sm font-medium ${mode === "new" ? "bg-secondary text-secondary-foreground" : ""}`}
                                onClick={() => setMode("new")}
                            >
                                {t("convertDialog.createNew")}
                            </button>
                            <button
                                type="button"
                                className={`flex-1 rounded-md border border-secondary p-2 text-sm font-medium ${mode === "existing" ? "bg-secondary text-secondary-foreground" : ""}`}
                                onClick={() => setMode("existing")}
                            >
                                {t("convertDialog.linkExisting")}
                            </button>
                        </div>

                        {mode === "new" ? (
                            lead && (
                                <div className="flex items-center gap-3 rounded-md border border-secondary p-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>{initials(lead.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{lead.fullName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {lead.phone}
                                            {lead.email ? ` · ${lead.email}` : ""}
                                        </p>
                                    </div>
                                </div>
                            )
                        ) : selectedClient ? (
                            <ClientCard client={selectedClient} selected onClick={() => setSelectedClient(null)} />
                        ) : (
                            <ClientSearch onSelect={setSelectedClient} onCreateNew={() => setMode("new")} />
                        )}

                        {errorMessage && (
                            <Alert variant="destructive">
                                <TriangleAlert />
                                <AlertTitle>{errorMessage}</AlertTitle>
                            </Alert>
                        )}
                    </div>
                </DialogBody>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" className="flex-1" disabled={isSubmitting} onClick={onClose}>
                            {t("convertDialog.cancel")}
                        </Button>
                    </DialogClose>
                    <Button
                        className="flex-1"
                        disabled={isSubmitting || (mode === "existing" && !selectedClient)}
                        onClick={handleConfirm}
                    >
                        <UserPlusIcon className="size-4" />
                        {isSubmitting ? t("convertDialog.converting") : t("convertDialog.convert")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
