import {useState} from "react";
import {Link} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {CircleDotIcon, MailIcon, MessageCircleIcon, PhoneCallIcon, UsersIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Toggle} from "@/components/ui/toggle.tsx";
import {getClientActivities} from "@/features/clients/api/clients.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {paths} from "@/routes/paths.ts";

// Activity types that are a conversation with the client, as logged from a lead.
const CONTACT_ICONS: Record<string, typeof PhoneCallIcon> = {
    CALL: PhoneCallIcon,
    MESSAGE_SENT: MessageCircleIcon,
    MEETING: UsersIcon,
    EMAIL: MailIcon,
};

const PAGE = 15;

/**
 * Everything that happened with this person in one timeline: calls and
 * meetings logged while they were a lead, then their deals' history, so
 * whoever picks up the client sees the whole story.
 */
export function ClientHistoryCard({ clientId }: { clientId: string }) {
    const { t, i18n } = useTranslation("clients");
    const [contactsOnly, setContactsOnly] = useState(false);
    const [shown, setShown] = useState(PAGE);

    const query = useQuery({
        queryKey: ["client", clientId, "activities"],
        queryFn: () => getClientActivities(clientId),
    });

    const all = query.data ?? [];
    const contactCount = all.filter((a) => a.type in CONTACT_ICONS).length;
    const items = contactsOnly ? all.filter((a) => a.type in CONTACT_ICONS) : all;

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between gap-2 border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("history.title")}</CardTitle>
                <Toggle
                    variant="outline"
                    size="sm"
                    pressed={contactsOnly}
                    onPressedChange={(pressed) => {
                        setContactsOnly(pressed);
                        setShown(PAGE);
                    }}
                >
                    <PhoneCallIcon className="size-3.5" />
                    {t("history.contactsOnly", { count: contactCount })}
                </Toggle>
            </CardHeader>
            <CardContent>
                {query.isLoading ? (
                    <div className="flex justify-center py-6"><Spinner className="size-5" /></div>
                ) : items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {contactsOnly ? t("history.noContacts") : t("history.empty")}
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
                                        <p className="font-medium">{isContact ? t(`history.types.${activity.type}`) : activity.title}</p>
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
                                            {activity.user?.fullName ?? t("history.system")} · {date} {time}
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
