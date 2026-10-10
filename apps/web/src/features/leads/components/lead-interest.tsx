import {useTranslation} from "react-i18next";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

/**
 * One line saying what the lead is looking for ("2 rooms · up to 52,000 KGS ·
 * Orion"), so a manager can pick the right units before calling back.
 */
export function useLeadInterest() {
    const { t } = useTranslation("leads");
    const { formatCurrency } = useCompanyFormatters();

    return (lead: Lead) => [
        lead.rooms != null && t("interest.rooms", { count: lead.rooms }),
        lead.budget != null && t("interest.budget", { amount: formatCurrency(Number(lead.budget)) }),
        lead.preferredProject?.name,
    ].filter(Boolean).join(" · ");
}
