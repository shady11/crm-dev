import type {TFunction} from "i18next";

/**
 * E2E-11: "Блок {{name}}" for a block named "Блок А" read "Блок Блок А".
 * When the name already starts with the label's own word, the name is
 * shown on its own.
 */
export function namedLabel(t: TFunction, key: string, name: string): string {
    const word = (t(key, {name: ""}) as string).trim().toLocaleLowerCase();
    const trimmed = name.trim();
    if (word && trimmed.toLocaleLowerCase().startsWith(word)) return trimmed;
    return t(key, {name}) as string;
}
