import {Prisma} from "@/generated/prisma/client";

type FieldSpec<T> =
    | keyof T
    | { field: keyof T; normalize: (value: unknown) => Prisma.InputJsonValue | null };

const identity = (value: unknown) => value as Prisma.InputJsonValue | null;

/**
 * Builds a {field: {from, to}} map for an Activity's metadata from only the
 * fields an update DTO actually touched and changed — a DTO field left
 * undefined (untouched by the request) is skipped entirely, and a field
 * whose new value matches the existing one is not reported as a change.
 *
 * Pass `{field, normalize}` instead of a bare key for a field whose stored
 * and incoming representations aren't directly comparable with `!==`
 * (Prisma.Decimal, a Date vs. an ISO string, etc.) — normalize both sides
 * before comparing and before recording them in the diff.
 *
 * Returns undefined (not `{}`) when nothing changed, so a caller can use the
 * result directly as `if (changes) { ...log... }`.
 */
export function diffChangedFields<T extends Record<string, unknown>>(
    dto: Partial<Record<keyof T, unknown>>,
    existing: T,
    fields: FieldSpec<T>[],
): Record<string, { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }> | undefined {
    const changes: Record<string, { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }> = {};

    for (const spec of fields) {
        const isSpec = typeof spec === "object" && spec !== null;
        const field = isSpec ? (spec as { field: keyof T }).field : (spec as keyof T);
        const normalize = isSpec
            ? (spec as { normalize: (value: unknown) => Prisma.InputJsonValue | null }).normalize
            : identity;

        const rawNext = dto[field];
        if (rawNext === undefined) continue;

        const next = normalize(rawNext);
        const prev = normalize(existing[field]);

        if (next !== prev) {
            changes[field as string] = { from: prev, to: next };
        }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
}
