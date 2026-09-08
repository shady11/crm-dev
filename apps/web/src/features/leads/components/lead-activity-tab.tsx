import {useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {PhoneCall, MessageCircle, Users} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {
    ContactAttemptType,
    getLeadActivities,
    logLeadContactAttempt,
    type Lead,
} from "@/features/leads/api/leads.api.ts";
import {formatCreatedAt} from "@/features/leads/utils/format.ts";

const CONTACT_TYPE_ICON: Record<ContactAttemptType, typeof PhoneCall> = {
    [ContactAttemptType.CALL]: PhoneCall,
    [ContactAttemptType.MESSAGE]: MessageCircle,
    [ContactAttemptType.MEETING]: Users,
};

interface LeadActivityTabProps {
    lead: Lead;
}

// SM-B1: logs a call/message/meeting against a lead in one click, and shows
// the resulting timeline. Before this, the only record of interaction was
// the single freeform comment field, so a lead called five times with no
// answer looked identical to one that had gone cold untouched.
export function LeadActivityTab({lead}: LeadActivityTabProps) {
    const {t, i18n} = useTranslation("leads");
    const queryClient = useQueryClient();
    const [type, setType] = useState<ContactAttemptType>(ContactAttemptType.CALL);
    const [note, setNote] = useState("");

    const activitiesQuery = useQuery({
        queryKey: ["leads", lead.id, "activities"],
        queryFn: () => getLeadActivities(lead.id),
    });

    const logMutation = useMutation({
        mutationFn: () => logLeadContactAttempt(lead.id, {type, note: note.trim() || undefined}),
        onSuccess: async () => {
            setNote("");
            await queryClient.invalidateQueries({queryKey: ["leads", lead.id, "activities"]});
            toast.success({title: t("activityTab.logSuccess")});
        },
        onError: () => {
            toast.error({title: t("activityTab.logError")});
        },
    });

    const typeCollection = createListCollection({
        items: [
            {label: t("activityTab.type.call"), value: ContactAttemptType.CALL},
            {label: t("activityTab.type.message"), value: ContactAttemptType.MESSAGE},
            {label: t("activityTab.type.meeting"), value: ContactAttemptType.MEETING},
        ],
    });

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-secondary p-3 space-y-3">
                <Select
                    collection={typeCollection}
                    value={[type]}
                    onValueChange={(item) => setType(item.value[0] as ContactAttemptType)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {typeCollection.items.map((item) => (
                            <SelectItem key={item.value} item={item}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Textarea
                    rows={2}
                    placeholder={t("activityTab.notePlaceholder")}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />

                <Button
                    size="sm"
                    className="w-full"
                    disabled={logMutation.isPending}
                    onClick={() => logMutation.mutate()}
                >
                    {logMutation.isPending ? t("activityTab.logging") : t("activityTab.logButton")}
                </Button>
            </div>

            {activitiesQuery.isLoading ? (
                <div className="flex justify-center py-6">
                    <Spinner className="size-5" />
                </div>
            ) : !activitiesQuery.data || activitiesQuery.data.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("activityTab.empty")}</p>
            ) : (
                <div className="flex flex-col divide-y">
                    {activitiesQuery.data.map((activity) => {
                        const Icon =
                            activity.type in CONTACT_TYPE_ICON
                                ? CONTACT_TYPE_ICON[activity.type as ContactAttemptType]
                                : MessageCircle;
                        const created = formatCreatedAt(activity.createdAt, i18n.language);

                        return (
                            <div key={activity.id} className="flex gap-3 py-3 text-sm">
                                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">{activity.title}</p>
                                    {activity.description && (
                                        <p className="text-muted-foreground">{activity.description}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {activity.user?.fullName ?? t("activityTab.system")} ·{" "}
                                        {t("overview.createdAt", {date: created.date, time: created.time})}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
