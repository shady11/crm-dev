import type {SettingOptionType} from "../types/setting-option.types";

const capitalize = (text: string, language: string) =>
    text ? text.charAt(0).toLocaleUpperCase(language) + text.slice(1) : text;

function timeZoneLabel(code: string, language: string): string | null {
    if (code === "UTC") return "UTC";
    const part = (timeZoneName: "longGeneric" | "shortOffset") =>
        new Intl.DateTimeFormat(language, {timeZone: code, timeZoneName})
            .formatToParts(new Date())
            .find((p) => p.type === "timeZoneName")?.value;
    const name = part("longGeneric");
    const offset = part("shortOffset")?.replace(/^GMT/, "UTC");
    if (!name) return null;
    return offset && offset !== "UTC" ? `${name} (${offset})` : name;
}

/**
 * A currency, language or time zone named in the reader's language, from
 * the browser's own data: "Киргизский сом", "Русский (Россия)",
 * "Киргизия (UTC+6)". The option list's labels are one English text set by
 * the platform operator ("Kyrgyzstani Som (KGS)", "Bishkek (UTC+6)"), which
 * the Russian and Kyrgyz settings page showed as they were. Null when the
 * browser can't name the code; the caller keeps the stored label.
 */
export function localizedOptionLabel(type: SettingOptionType, code: string, language: string): string | null {
    try {
        if (type === "CURRENCY") {
            const name = new Intl.DisplayNames([language], {type: "currency"}).of(code);
            return name && name !== code ? capitalize(name, language) : null;
        }
        if (type === "LOCALE") {
            const name = new Intl.DisplayNames([language], {type: "language"}).of(code);
            return name && name !== code ? capitalize(name, language) : null;
        }
        return timeZoneLabel(code, language);
    } catch {
        return null;
    }
}
