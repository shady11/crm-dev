import type {TFunction} from "i18next";

/**
 * "Блок А": which block a unit is in. Numbers repeat across blocks (each
 * has its own 302), so a list that shows "№302" alone can point at two
 * flats. A block already named "Блок А" is shown as it is, not "Блок Блок А".
 */
export function blockLabel(t: TFunction, block: {name: string} | null | undefined): string | null {
    const name = block?.name?.trim();
    if (!name) return null;
    const word = (t("labels.block", {ns: "common"}) as string).trim();
    return name.toLocaleLowerCase().startsWith(word.toLocaleLowerCase()) ? name : `${word} ${name}`;
}
