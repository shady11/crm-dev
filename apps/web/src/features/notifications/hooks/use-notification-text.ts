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
            if (!n.templateKey) return {title: n.title, message: n.message};
            const base = `notifications:templates.${n.templateKey}`;

            const values: Record<string, unknown> = {...(n.params ?? {})};
            if (typeof values.amount === "number") values.amount = formatCurrency(values.amount);
            // SH-2: list-price changes carry the old and new price.
            if (typeof values.fromPrice === "number") values.fromPrice = formatCurrency(values.fromPrice);
            if (typeof values.toPrice === "number") values.toPrice = formatCurrency(values.toPrice);
            if (typeof values.status === "string") {
                values.status = t(DEAL_STATUS_LABEL_KEYS[values.status as DealStatus] ?? values.status);
            }
            if (typeof values.date === "string") values.date = formatDate(values.date, i18n.language).date;
            // Day counts drive plural forms ("1 day" / "7 days", "день/дня/дней").
            if (typeof values.days === "number") values.count = values.days;
            // Same for the number of open tasks a reassignment handed over.
            if (typeof values.tasks === "number") values.count = values.tasks;

            // Checked with the values, so a title that only has plural forms
            // (title_one, title_other…) is found too.
            if (!i18n.exists(`${base}.title`, values)) return {title: n.title, message: n.message};

            return {
                title: t(`${base}.title`, values),
                // With the values, so a message that only has plural forms
                // (message_one, message_other…) is found too.
                message: i18n.exists(`${base}.message`, values) ? t(`${base}.message`, values) : n.message,
            };
        },
        [t, i18n, formatCurrency],
    );
}
