export function daysUntil(dateString: string | null): number | null {
    if (!dateString) return null;
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}