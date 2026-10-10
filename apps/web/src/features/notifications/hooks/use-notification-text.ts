import {useCallback} from "react";
import {useTranslation} from "react-i18next";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {DEAL_STATUS_LABEL_KEYS, type DealStatus} from "@/features/deals/types/deal.types.ts";
import {formatDate} from "@/utils/date-formatter.ts";

/**
 * A notification's title and message in the reader's language. The API
 * stores a template key and raw values; this formats the values (money,
 * statuses, dates) and fills the translation. Rows without a template, or
 * with one this build doesn't know, show the English text stored with them.
 */
export function useNotificationText() {
    const {t, i18n} = useTranslation(["notifications", "deals"]);
    const {formatCurrency} = useCompanyFormatters();

    return useCallback(
        (n: Pick<Notification, "title" | "message" | "templateKey" | "params">) => {
            const base = `notifications:templates.${n.templateKey}`;
            if (!n.templateKey || !i18n.exists(`${base}.title`)) {
                return {title: n.title, message: n.message};
            }

            const values: Record<string, unknown> = {...(n.params ?? {})};
            if (typeof values.amount === "number") values.amount = formatCurrency(values.amount);
            if (typeof values.status === "string") {
                values.status = t(DEAL_STATUS_LABEL_KEYS[values.status as DealStatus] ?? values.status);
            }
            if (typeof values.date === "string") values.date = formatDate(values.date, i18n.language).date;
            // Day counts drive plural forms ("1 day" / "7 days", "день/дня/дней").
            if (typeof values.days === "number") values.count = values.days;

            return {
                title: t(`${base}.title`, values),
                message: i18n.exists(`${base}.message`) ? t(`${base}.message`, values) : n.message,
            };
        },
        [t, i18n, formatCurrency],
    );
}
