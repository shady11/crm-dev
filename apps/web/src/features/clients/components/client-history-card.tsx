import {useState} from "react";
import {Link} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {CircleDotIcon, MailIcon, MessageCircleIcon, PhoneCallIcon, UsersIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {getClientActivities} from "@/features/clients/api/clients.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {paths} from "@/routes/paths.ts";
import {useActivityTitle} from "@/features/activities/hooks/use-activity-title.ts";
import {useActivityActor} from "@/features/activities/hooks/use-activity-actor.ts";

// Activity types that are a conversation with the client, as logged from a lead.
const CONTACT_ICONS: Record<string, typeof PhoneCallIcon> = {
    CALL: PhoneCallIcon,
    MESSAGE_SENT: MessageCircleIcon,
    MEETING: UsersIcon,
    EMAIL: MailIcon,
};

const PAGE = 15;

type HistoryTab = "general" | "calls" | "meetings";
// Which activity types each tab shows; General shows everything.
const TAB_TYPES: Record<Exclude<HistoryTab, "general">, string> = {calls: "CALL", meetings: "MEETING"};

/**
 * Everything that happened with this person in one timeline: calls and
 * meetings logged while they were a lead, then their deals' history, so
 * whoever picks up the client sees the whole story.
 */
export function ClientHistoryCard({ clientId }: { clientId: string }) {
    const { t, i18n } = useTranslation("clients");
    const activityTitle = useActivityTitle();
    const activityActor = useActivityActor();
    const [tab, setTab] = useState<HistoryTab>("general");
    const [shown, setShown] = useState(PAGE);

    const query = useQuery({
        queryKey: ["client", clientId, "activities"],
        queryFn: () => getClientActivities(clientId),
    });

    const all = query.data ?? [];
    const counts: Record<HistoryTab, number> = {
        general: all.length,
        calls: all.filter((a) => a.type === TAB_TYPES.calls).length,
        meetings: all.filter((a) => a.type === TAB_TYPES.meetings).length,
    };
    const items = tab === "general" ? all : all.filter((a) => a.type === TAB_TYPES[tab]);
    const emptyText = tab === "calls" ? t("history.noCalls") : tab === "meetings" ? t("history.noMeetings") : t("history.empty");

    return (
        <Card className="border pt-0">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("history.title")}</CardTitle>
                <Tabs
                    value={tab}
                    onValueChange={({ value }) => {
                        setTab(value as HistoryTab);
                        setShown(PAGE);
                    }}
                >
                    <TabsList>
                        {(["general", "calls", "meetings"] as const).map((key) => (
                            <TabsTrigger key={key} value={key} className="grow-0 px-3">
                                {t(`history.tabs.${key}`)}
                                {counts[key] > 0 && (
                                    <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{counts[key]}</span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                {query.isLoading ? (
                    <div className="flex justify-center py-6"><Spinner className="size-5" /></div>
                ) : items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {emptyText}
                    </p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {items.slice(0, shown).map((activity) => {
                            const isContact = activity.type in CONTACT_ICONS;
                            const Icon = isContact ? CONTACT_ICONS[activity.type] : CircleDotIcon;
                            const { date, time } = formatDate(activity.createdAt, i18n.language);
                            return (
                                <div key={activity.id} className="flex gap-3 py-3 text-sm">
                                    <Icon className={`mt-0.5 size-4 shrink-0 ${isContact ? "text-primary" : "text-muted-foreground"}`} />
                                    <div className="min-w-0 flex-1">
                                        {/* A logged contact is stored as "Contact attempt logged"; say what it was. */}
                                        <p className="font-medium">{isContact ? t(`history.types.${activity.type}`) : activityTitle(activity)}</p>
                                        {activity.description && (
                                            <p className="whitespace-pre-line text-muted-foreground">{activity.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {activity.deal ? (
                                                <Link to={paths.deals.detail(activity.deal.id)} className="font-medium text-foreground hover:underline">
                                                    {t("history.deal", { number: activity.deal.dealNumber })}
                                                </Link>
                                            ) : activity.lead ? (
                                                <span className="font-medium text-foreground">{t("history.lead")}</span>
                                            ) : (
                                                <span className="font-medium text-foreground">{t("history.client")}</span>
                                            )}
                                            {" · "}
                                            {activityActor(activity, t("history.system"))} · {date} {time}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {items.length > shown && (
                    <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setShown((n) => n + PAGE * 2)}>
                        {t("history.showMore", { count: items.length - shown })}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
