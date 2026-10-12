import type {TFunction} from "i18next";

/** "just now", "5m ago", "3h ago", "2d ago" — dashboard namespace wording. */
export function timeAgo(t: TFunction, iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t("recentActivity.justNow", {ns: "dashboard"});
    if (mins < 60) return t("recentActivity.minutesAgo", {ns: "dashboard", count: mins});
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("recentActivity.hoursAgo", {ns: "dashboard", count: hours});
    return t("recentActivity.daysAgo", {ns: "dashboard", count: Math.floor(hours / 24)});
}
