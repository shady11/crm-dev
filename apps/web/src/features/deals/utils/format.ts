export function initials(fullName: string) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function formatCreatedAt(iso: string) {
    const date = new Date(iso);
    return {
        date: date.toLocaleDateString("ru-RU", { month: "long", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
}