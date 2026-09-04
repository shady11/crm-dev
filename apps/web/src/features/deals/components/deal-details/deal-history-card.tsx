import {CheckCircle2Icon,} from "lucide-react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import type {DealActivity} from "@/features/deals/api/deals.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {useTranslation} from "react-i18next";

export function DealHistoryCard({ activities }: { activities: DealActivity[] }) {
    const { t, i18n } = useTranslation("deals");
    const sorted = [...activities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader title={t("historyCard.title")} className="py-4 border-b gap-0"></CardHeader>
            <CardContent>
                {sorted.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("historyCard.empty")}</p>
                ) : (
                    <div className="relative flex flex-col gap-5">
                        <div className="absolute left-4 top-2 bottom-2 w-px bg-border"></div>
                        {sorted.map((activity) => {
                            const { date, time } = formatDate(activity.createdAt, i18n.language);

                            return (
                                <div key={activity.id} className="relative flex gap-3">
                                    <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                                        <CheckCircle2Icon size={14} className="text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <p className="text-sm font-medium">{activity.title}</p>
                                        {activity.description && (
                                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                                        )}
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {date} · {time}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}