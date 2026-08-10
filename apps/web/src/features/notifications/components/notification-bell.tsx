import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {BellIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {
    useNotificationActions,
    useNotificationsList,
    useUnreadCount
} from "@/features/notifications/hooks/use-notifications.ts";
import {getNotificationLink} from "@/features/notifications/utils/notification-link.ts";
import {NOTIFICATION_VISUALS} from "@/features/notifications/types/notification.types.ts";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";
import {Float} from "@/components/ui/float.tsx";

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<"all" | "unread">("all");
    const navigate = useNavigate();

    const unreadQuery = useUnreadCount();
    const listQuery = useNotificationsList(open, tab === "unread" ? false : undefined);
    const actions = useNotificationActions();

    const notifications = listQuery.data?.items ?? [];
    const unreadCount = unreadQuery.data ?? 0;

    const handleClick = (notification: Notification) => {
        if (!notification.isRead) actions.markAsRead.mutate(notification.id);
        const link = getNotificationLink(notification);
        if (link) navigate(link);
        setOpen(false);
    };

    return (
        <>
            <div className="relative">
                <Button variant="ghost" size="icon-md" className="relative" onClick={() => setOpen(true)}>
                    <BellIcon />
                </Button>
                {unreadCount > 0 && (
                    <Float>
                        <Badge pill size="xs" variant="default">
                            <small>{unreadCount > 9 ? "9+" : unreadCount}</small>
                        </Badge>
                    </Float>
                )}
            </div>

            <Sheet open={open} onOpenChange={({ open: isOpen }) => setOpen(isOpen)}>
                <SheetContent variant="inset" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Notifications</SheetTitle>
                    </SheetHeader>

                    <div className="px-6 pb-2">
                        <Tabs value={tab} onValueChange={({ value }) => setTab(value as "all" | "unread")}>
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="unread">
                                    Unread{unreadCount > 0 && ` (${unreadCount})`}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <SheetBody scrollFade className="px-0">
                        {notifications.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                {tab === "unread" ? "You're all caught up." : "No notifications yet."}
                            </p>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {notifications.map((n) => {
                                    const visual = NOTIFICATION_VISUALS[n.type];
                                    const Icon = visual.icon;

                                    return (
                                        <button
                                            key={n.id}
                                            onClick={() => handleClick(n)}
                                            className={`flex items-start w-full gap-4 px-6 py-4 text-left hover:bg-secondary/40 ${
                                                !n.isRead ? "bg-primary/5" : ""
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`flex size-8 items-center justify-center rounded-full text-white ${visual.bg}`}>
                                                    <Icon size={20} />
                                                </div>
                                                {!n.isRead && (
                                                    <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                                <p className="text-sm font-medium">{n.title}</p>
                                                <div className="flex items-center gap-2 text-xs truncate text-muted-foreground">
                                                    {timeAgo(n.createdAt)}
                                                    <div className="size-1 bg-muted-foreground rounded-full"></div>
                                                    {n.message && (
                                                        <span>{n.message}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </SheetBody>

                    <SheetFooter>
                        <Button
                            variant="secondary"
                            className="flex-1"
                            disabled={unreadCount === 0}
                            onClick={() => actions.markAllAsRead.mutate()}
                        >
                            Mark all as read
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}