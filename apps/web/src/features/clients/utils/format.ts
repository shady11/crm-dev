import {formatDate} from "@/utils/date-formatter.ts";

export function initials(fullName: string) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

/** dd/mm/yyyy and a 24-hour time, as everywhere else in the app. */
export function formatCreatedAt(iso: string, locale = "ru-RU") {
    return formatDate(iso, locale);
}
