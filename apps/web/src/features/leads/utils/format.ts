export function initials(fullName: string) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

/**
 * A next-contact day from a date field (YYYY-MM-DD) as a timestamp: 09:00
 * local time, the start of a working day, so it lands in that day's list.
 */
export function nextContactToIso(day: string) {
    return new Date(`${day}T09:00:00`).toISOString();
}

/** Local YYYY-MM-DD for a stored timestamp, for a date field. */
export function isoToDay(iso: string | null | undefined) {
    if (!iso) return "";
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatCreatedAt(iso: string, locale = "ru-RU") {
    const date = new Date(iso);
    return {
        date: date.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    };
}
