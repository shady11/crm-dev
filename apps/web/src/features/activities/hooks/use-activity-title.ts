import {useCallback} from "react";
import {useTranslation} from "react-i18next";
import {DOCUMENT_TYPE_LABEL_KEYS, type DocumentType} from "@/features/documents/types/document.types.ts";

export type ActivityTitleSource = {
    title: string;
    templateKey?: string | null;
    templateParams?: Record<string, unknown> | null;
};

/**
 * An activity's title in the reader's language. The API stores a template
 * key and raw values next to the English title (see activity-templates.ts);
 * rows without a key, or with one this build doesn't know, show the English.
 */
export function useActivityTitle() {
    const {t, i18n} = useTranslation(["activities", "documents"]);

    return useCallback(
        (a: ActivityTitleSource) => {
            if (!a.templateKey) return a.title;
            const key = `activities:templates.${a.templateKey}`;

            const values: Record<string, unknown> = {...(a.templateParams ?? {})};
            if (typeof values.documentType === "string") {
                values.documentType = t(DOCUMENT_TYPE_LABEL_KEYS[values.documentType as DocumentType] ?? values.documentType);
            }

            // Checked with the values, so a title that only has plural forms
            // (unitsImported_one, unitsImported_other…) is found too.
            return i18n.exists(key, values) ? t(key, values) : a.title;
        },
        [t, i18n],
    );
}
