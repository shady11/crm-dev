import {useQuery} from "@tanstack/react-query";
import {UserPlusIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {getClient} from "@/features/clients/api/clients.api.ts";
import type {Lead} from "@/features/leads/api/leads.api.ts";

interface LeadClientTabProps {
    lead: Lead;
    onConvert(): void;
}

export function LeadClientTab({ lead, onConvert }: LeadClientTabProps) {
    const clientId = lead.client?.id;

    const clientQuery = useQuery({
        queryKey: ["client", clientId],
        queryFn: () => getClient(clientId!),
        enabled: !!clientId,
    });

    if (!clientId) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                    This lead hasn't been converted to a client yet.
                </p>
                <Button onClick={onConvert}>
                    <UserPlusIcon className="size-4" />
                    Convert to client
                </Button>
            </div>
        );
    }

    if (clientQuery.isLoading) {
        return (
            <div className="flex h-32 items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    const client = clientQuery.data;

    if (!client) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                Linked client could not be loaded.
            </p>
        );
    }

    return (
        <div className="rounded-lg border border-secondary px-4 py-2">
            <DataList className="divide-y">
                <DataListItem>
                    <DataListItemLabel>Full name</DataListItemLabel>
                    <DataListItemValue>{client.fullName}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Phone</DataListItemLabel>
                    <DataListItemValue>{client.phone}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>WhatsApp</DataListItemLabel>
                    <DataListItemValue>{client.whatsapp ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Email</DataListItemLabel>
                    <DataListItemValue>{client.email ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Passport</DataListItemLabel>
                    <DataListItemValue>{client.passport ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Leads</DataListItemLabel>
                    <DataListItemValue>{client.leads.length}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Deals</DataListItemLabel>
                    <DataListItemValue>{client.deals.length}</DataListItemValue>
                </DataListItem>
            </DataList>
        </div>
    );
}
