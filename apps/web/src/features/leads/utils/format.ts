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
        date: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
}
