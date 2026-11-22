const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * A calendar day as dd/mm/yyyy, the same in every language. Built by hand
 * rather than with toLocaleDateString, which spells it differently per
 * locale ("Nov 21, 2026", "21 нояб. 2026 г.", "11/21/2026").
 * `utc` reads a date-only value ("2026-11-21") without a timezone shift.
 */
export function formatDay(value: string | Date, options: { utc?: boolean } = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return options.utc
        ? `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
        : `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDate(iso: string, locale = "ru-RU") {
    const date = new Date(iso);
    return {
        date: formatDay(date),
        time: date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    };
}
