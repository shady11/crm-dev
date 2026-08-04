export function formatDate(iso: string) {
    const date = new Date(iso);
    return {
        date: date.toLocaleDateString("ru-RU", { month: "long", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
}