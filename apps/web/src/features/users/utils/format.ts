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
        date: date.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    };
}
