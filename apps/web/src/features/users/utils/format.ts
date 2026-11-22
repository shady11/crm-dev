import {formatDay} from "@/utils/date-formatter.ts";

export function initials(fullName: string) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function formatCreatedAt(iso: string, locale = "ru-RU") {
    const date = new Date(iso);
    return {
        date: formatDay(date),
        time: date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    };
}
