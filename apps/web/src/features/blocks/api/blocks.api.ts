import { api } from "@/lib/api";
import type { Block } from "../types/block.types";
import type {PaginatedResponse} from "@/lib/api-types.ts";

export type BlockPayload = {
    name: string;
    code?: string;
};

export async function getBlocks(projectId: string) {
    const response = await api.get<
        PaginatedResponse<Block>
    >(`/projects/${projectId}/blocks`);

    return response.data;
}

export async function createBlock(
    projectId: string,
    payload: BlockPayload,
) {
    const response = await api.post<Block>(
        `/projects/${projectId}/blocks`,
        payload,
    );

    return response.data;
}

export async function updateBlock(
    blockId: string,
    payload: BlockPayload,
) {
    const response = await api.patch<Block>(
        `/blocks/${blockId}`,
        payload,
    );

    return response.data;
}

export async function deleteBlock(blockId: string) {
    await api.delete(`/blocks/${blockId}`);
}