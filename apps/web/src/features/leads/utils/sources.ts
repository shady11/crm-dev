/**
 * The channels a lead can come from. Stored as these English values so
 * reports group cleanly; shown translated. Older free-text values still
 * display as typed.
 */
export const LEAD_SOURCES = ["Website", "Instagram", "Facebook", "WhatsApp", "Referral", "Walk-in", "Phone", "Other"] as const;

export function leadSourceLabel(t: (key: string) => string, source: string | null | undefined) {
    if (!source) return "—";
    return (LEAD_SOURCES as readonly string[]).includes(source) ? t(`leads:sources.${source}`) : source;
}
