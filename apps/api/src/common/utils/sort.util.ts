/**
 * Builds a Prisma `orderBy` value from a validated sortBy/sortOrder query
 * pair. Callers must have already restricted `sortBy` to a known-safe field
 * name (e.g. via `@IsIn(ALLOWED_FIELDS)` on the DTO) — this just decides
 * whether to use it or fall back to the module's default ordering.
 */
export function resolveOrderBy<TOrderBy>(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
  allowedFields: readonly string[],
  fallback: TOrderBy,
): TOrderBy {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return fallback;
  }

  return { [sortBy]: sortOrder ?? 'asc' } as TOrderBy;
}
