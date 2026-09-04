export function formatDate(iso: string, locale = "ru-RU") {
    const date = new Date(iso);
    return {
        date: date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    };
}
