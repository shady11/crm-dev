import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {WhatsAppLink} from "@/components/shared/whatsapp-link.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_CLASSES, LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {formatCreatedAt} from "@/features/leads/utils/format.ts";
import {useTranslation} from "react-i18next";

interface LeadOverviewProps {
    lead: Lead;
}

export function LeadOverview({ lead }: LeadOverviewProps) {
    const { t, i18n } = useTranslation("leads");

    const created = formatCreatedAt(lead.createdAt, i18n.language);

    return (
        <div className="rounded-lg border border-secondary px-4 py-2">
            <DataList className="divide-y">
                <DataListItem>
                    <DataListItemLabel>{t("overview.fullName")}</DataListItemLabel>
                    <DataListItemValue>{lead.fullName}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.phone")}</DataListItemLabel>
                    <DataListItemValue className="flex items-center gap-3">
                        {lead.phone}
                        <WhatsAppLink phone={lead.phone} />
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.email")}</DataListItemLabel>
                    <DataListItemValue>{lead.email ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.status")}</DataListItemLabel>
                    <DataListItemValue>
                        <Badge className={`${LEAD_STATUS_CLASSES[lead.status]} text-white`}>
                            {t(LEAD_STATUS_LABEL_KEYS[lead.status])}
                        </Badge>
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.source")}</DataListItemLabel>
                    <DataListItemValue>{lead.source ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.manager")}</DataListItemLabel>
                    <DataListItemValue>{lead.manager?.fullName ?? t("overview.unassigned")}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.comment")}</DataListItemLabel>
                    <DataListItemValue>{lead.comment ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.created")}</DataListItemLabel>
                    <DataListItemValue>
                        {t("overview.createdAt", { date: created.date, time: created.time })}
                    </DataListItemValue>
                </DataListItem>
            </DataList>
        </div>
    );
}
