import type {Block} from "@/features/blocks/types/block.types.ts";
import {PhaseSalesStatus} from "@/features/phases/types/phase.types.ts";

/**
 * Navigation state that marks a deliberate trip back to a picker (the Back
 * button), so the picker shows its list instead of forwarding again.
 */
export const BROWSE_STATE = {browse: true} as const;

export function isBrowsing(state: unknown) {
    return !!state && typeof state === "object" && (state as {browse?: unknown}).browse === true;
}

type LastView = {blockId: string; entranceId: string};

const key = (projectId: string) => `chessboard:last:${projectId}`;

/** The block and entrance this browser last had open in the project, if any. */
export function readLastView(projectId: string): LastView | null {
    try {
        const raw = localStorage.getItem(key(projectId));
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<LastView>;
        return typeof value.blockId === "string" && typeof value.entranceId === "string"
            ? {blockId: value.blockId, entranceId: value.entranceId}
            : null;
    } catch {
        return null;
    }
}

export function saveLastView(projectId: string, view: LastView) {
    try {
        localStorage.setItem(key(projectId), JSON.stringify(view));
    } catch {
        // Storage can be unavailable (private mode, blocked site data); the
        // chessboard just opens at the pickers next time.
    }
}

/**
 * Where opening the chessboard should land: the last entrance viewed if it
 * still exists; else, in a project split into phases, the first block on
 * sale; else straight into the only block. Null means show the block list.
 */
export function chessboardLanding(projectId: string, blocks: Block[]): string | null {
    const last = readLastView(projectId);
    if (last) {
        const block = blocks.find((b) => b.id === last.blockId);
        if (block?.entrances?.some((e) => e.id === last.entranceId)) {
            return `${last.blockId}/${last.entranceId}`;
        }
    }
    if (blocks.some((b) => b.phase)) {
        const onSale = blocks.find((b) => b.phase?.salesStatus === PhaseSalesStatus.ON_SALE);
        const entrance = onSale?.entrances?.[0];
        if (onSale && entrance) return `${onSale.id}/${entrance.id}`;
    }
    if (blocks.length === 1) {
        const [only] = blocks;
        return only.entrances?.length === 1 ? `${only.id}/${only.entrances[0].id}` : only.id;
    }
    return null;
}
