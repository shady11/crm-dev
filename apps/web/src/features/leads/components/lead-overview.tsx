import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_CLASSES, LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {formatCreatedAt} from "@/features/leads/utils/format.ts";
import {useTranslation} from "react-i18next";

interface LeadOverviewProps {
    lead: Lead;
}

export function LeadOverview({ lead }: LeadOverviewProps) {
    const { t } = useTranslation("leads");

    const created = formatCreatedAt(lead.createdAt);

    return (
        <div className="rounded-lg border border-secondary px-4 py-2">
            <DataList className="divide-y">
                <DataListItem>
                    <DataListItemLabel>Full name</DataListItemLabel>
                    <DataListItemValue>{lead.fullName}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Phone</DataListItemLabel>
                    <DataListItemValue>{lead.phone}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Email</DataListItemLabel>
                    <DataListItemValue>{lead.email ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Status</DataListItemLabel>
                    <DataListItemValue>
                        <Badge className={`${LEAD_STATUS_CLASSES[lead.status]} text-white`}>
                            {t(LEAD_STATUS_LABEL_KEYS[lead.status])}
                        </Badge>
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Source</DataListItemLabel>
                    <DataListItemValue>{lead.source ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Manager</DataListItemLabel>
                    <DataListItemValue>{lead.manager?.fullName ?? "Unassigned"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Comment</DataListItemLabel>
                    <DataListItemValue>{lead.comment ?? "—"}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>Created</DataListItemLabel>
                    <DataListItemValue>
                        {created.date} at {created.time}
                    </DataListItemValue>
                </DataListItem>
            </DataList>
        </div>
    );
}
