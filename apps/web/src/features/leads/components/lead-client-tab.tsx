import {useQuery} from "@tanstack/react-query";
import {UserPlusIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {getClient} from "@/features/clients/api/clients.api.ts";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {useTranslation} from "react-i18next";

interface LeadClientTabProps {
    lead: Lead;
    onConvert(): void;
}

export function LeadClientTab({ lead, onConvert }: LeadClientTabProps) {
    const { t } = useTranslation("leads");
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
                    {t("clientTab.notConverted")}
                </p>
                <Button onClick={onConvert}>
                    <UserPlusIcon className="size-4" />
                    {t("clientTab.convertToClient")}
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
                {t("clientTab.loadError")}
            </p>
        );
    }

    return (
        <div className="rounded-lg border border-secondary px-4 py-2">
            <DataList className="divide-y">
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.fullName")}</DataListItemLabel>
                    <DataListItemValue>{client.fullName}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.phone")}</DataListItemLabel>
                    <DataListItemValue>{client.phone}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.whatsapp")}</DataListItemLabel>
                    <DataListItemValue>{client.whatsapp ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.email")}</DataListItemLabel>
                    <DataListItemValue>{client.email ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.passport")}</DataListItemLabel>
                    <DataListItemValue>{client.passport ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.leads")}</DataListItemLabel>
                    <DataListItemValue>{client.leads.length}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("clientTab.deals")}</DataListItemLabel>
                    <DataListItemValue>{client.deals.length}</DataListItemValue>
                </DataListItem>
            </DataList>
        </div>
    );
}
