import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {WhatsAppLink} from "@/components/shared/whatsapp-link.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_CLASSES, LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {formatCreatedAt} from "@/features/leads/utils/format.ts";
import {leadSourceLabel} from "@/features/leads/utils/sources.ts";
import {FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

interface LeadOverviewProps {
    lead: Lead;
}

export function LeadOverview({ lead }: LeadOverviewProps) {
    const { t, i18n } = useTranslation("leads");
    const { formatCurrency } = useCompanyFormatters();

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
                    <DataListItemValue>{leadSourceLabel(t, lead.source)}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.rooms")}</DataListItemLabel>
                    <DataListItemValue>{lead.rooms ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.budget")}</DataListItemLabel>
                    <DataListItemValue>
                        {lead.budget != null ? t("interest.budget", { amount: formatCurrency(Number(lead.budget)) }) : "—"}
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.preferredProject")}</DataListItemLabel>
                    <DataListItemValue>{lead.preferredProject?.name ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.financingType")}</DataListItemLabel>
                    <DataListItemValue>{lead.financingType ? t(FINANCING_TYPE_LABEL_KEYS[lead.financingType]) : "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.manager")}</DataListItemLabel>
                    <DataListItemValue>{lead.manager?.fullName ?? t("overview.unassigned")}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.nextContact")}</DataListItemLabel>
                    <DataListItemValue>
                        {lead.nextContactAt ? formatCreatedAt(lead.nextContactAt, i18n.language).date : "—"}
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.lastContact")}</DataListItemLabel>
                    <DataListItemValue>
                        {lead.lastContactAt ? formatCreatedAt(lead.lastContactAt, i18n.language).date : "—"}
                    </DataListItemValue>
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
