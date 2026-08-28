import {useMemo} from "react";

export type CompanySettings = {
    currency?: string | null;
    locale?: string | null;
    timezone?: string | null;
};

const DEFAULT_CURRENCY = "KGS"; // matches Company.currency's own schema default
const DEFAULT_LOCALE = "ru-RU"; // primary target market language, not a browser guess

/**
 * Centralizes number/currency/date formatting so it can never again drift
 * into the inconsistent state found this session — some components hardcoding
 * "ru-RU", others "en-US", all of them hardcoding "$" regardless of the
 * company's actual configured currency.
 *
 * `company` is optional and defaults are deliberately conservative rather
 * than guessing — see the runbook for wiring this to real company data via
 * whatever exposes the authenticated user's company settings on the frontend.
 */
export function useFormatters(company?: CompanySettings) {

    const locale = company?.locale || DEFAULT_LOCALE;
    const currency = company?.currency || DEFAULT_CURRENCY;

    return useMemo(() => {
        const number = new Intl.NumberFormat(locale);
        const currencyFmt = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        });
        const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
        const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

        return {
            formatNumber: (value: number) => number.format(value),
            formatCurrency: (value: number) => currencyFmt.format(value),
            formatPricePerSqm: (value: number) => `${number.format(value)} ${currency}/m²`,
            formatDate: (value: string | Date) => date.format(new Date(value)),
            formatDateTime: (value: string | Date) => dateTime.format(new Date(value)),
        };
    }, [locale, currency]);
}