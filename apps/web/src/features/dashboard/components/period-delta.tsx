import {ArrowDownRightIcon, ArrowUpRightIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import type {DashboardPeriod} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

/**
 * How a number moved against the same stretch of the previous period:
 * a green or red percentage, "new" when there was nothing to compare with,
 * and the previous value itself so the percentage isn't read on its own.
 */
export function PeriodDelta({current, previous, period, formatPrevious}: {
    current: number;
    previous: number;
    period: DashboardPeriod;
    formatPrevious: (value: number) => string;
}) {
    const {t} = useTranslation("dashboard");

    let badge;
    if (previous === 0) {
        badge = current > 0
            ? <Badge variant="info">{t("compare.new")}</Badge>
            : <Badge variant="secondary">{t("compare.noChange")}</Badge>;
    } else {
        const change = Math.round(((current - previous) / previous) * 100);
        if (change === 0) {
            badge = <Badge variant="secondary">{t("compare.noChange")}</Badge>;
        } else {
            const up = change > 0;
            badge = (
                <Badge variant={up ? "success" : "destructive"}>
                    {up ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
                    {`${up ? "+" : ""}${change}%`}
                </Badge>
            );
        }
    }

    return (
        <span className="flex flex-wrap items-center gap-1.5">
            {badge}
            <span>{t(`compare.${period}`, {value: formatPrevious(previous)})}</span>
        </span>
    );
}
