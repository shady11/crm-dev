/**
 * A unit as people tell it apart: "А / 302". Numbers repeat across blocks
 * (each block has its own 302), so a bare number on a list or an export
 * can point at two flats. Same form as the sale contract.
 */
export function unitLabel(unit: {
  number: string;
  block?: { name: string } | null;
}): string {
  const block = unit.block?.name?.trim();
  return block ? `${block} / ${unit.number}` : unit.number;
}
