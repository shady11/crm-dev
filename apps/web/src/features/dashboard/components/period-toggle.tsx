import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import type {DashboardPeriod} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

const DASHBOARD_PERIODS: DashboardPeriod[] = ["month", "quarter", "year"];

// This month / quarter / year, to date: the period every headline number,
// the collections card and the manager table count over.
export function PeriodToggle({value, onChange}: {value: DashboardPeriod; onChange: (period: DashboardPeriod) => void}) {
    const {t} = useTranslation("dashboard");

    return (
        <ToggleGroup
            size="sm"
            variant="outline"
            multiple={false}
            value={[value]}
            onValueChange={({value: next}) => {
                if (next[0]) onChange(next[0] as DashboardPeriod);
            }}
            aria-label={t("period.label")}
        >
            {DASHBOARD_PERIODS.map((period) => (
                <ToggleGroupItem key={period} value={period} className="px-3">{t(`period.${period}`)}</ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
