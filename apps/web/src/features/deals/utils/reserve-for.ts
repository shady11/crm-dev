/**
 * E2E-8: "Reserve a unit" for a client travels to the chessboard in the URL
 * (?reserveFor=<clientId>&rooms=2&priceMax=6500000), so the chessboard can
 * filter to what the client asked for and the booking form can start with
 * the client chosen. The URL keeps it through a reload and drops it as soon
 * as the manager leaves the chessboard.
 */
export type ReserveFor = {
    clientId: string;
    rooms?: number;
    priceMax?: number;
};

export function reserveForSearch({clientId, rooms, priceMax}: ReserveFor): string {
    const params = new URLSearchParams({reserveFor: clientId});
    if (rooms) params.set("rooms", String(rooms));
    if (priceMax) params.set("priceMax", String(priceMax));
    return `?${params.toString()}`;
}

export function readReserveFor(search: string | URLSearchParams): ReserveFor | null {
    const params = typeof search === "string" ? new URLSearchParams(search) : search;
    const clientId = params.get("reserveFor");
    if (!clientId) return null;
    const number = (key: string) => {
        const value = Number(params.get(key));
        return Number.isFinite(value) && value > 0 ? value : undefined;
    };
    return {clientId, rooms: number("rooms"), priceMax: number("priceMax")};
}
