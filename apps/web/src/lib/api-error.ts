import {isAxiosError} from "axios";

/** The message an API error came with (Nest sends a string, or a list from validation). */
export function apiErrorMessage(error: unknown): string | undefined {
    if (!isAxiosError<{message?: string | string[]}>(error)) return undefined;
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
}
