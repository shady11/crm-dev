import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEn from "./locales/en/common.json";
import dealsEn from "./locales/en/deals.json";
import unitsEn from "./locales/en/units.json";
import commonRu from "./locales/ru/common.json";
import dealsRu from "./locales/ru/deals.json";
import unitsRu from "./locales/ru/units.json";

export const resources = {
    en: {
        common: commonEn,
        deals: dealsEn,
        units: unitsEn,
    },
    ru: {
        common: commonRu,
        deals: dealsRu,
        units: unitsRu,
    },
} as const;

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "ru",
        defaultNS: "common",
        ns: Object.keys(resources.ru),

        interpolation: {
            escapeValue: false,
        },

        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
        },
    });

export function setCompanyLocale(locale: string | null | undefined) {
    if (!locale) return;
    const lang = locale.split("-")[0]; // "ru-RU" -> "ru", matches resource keys above
    if (lang !== i18n.language) {
        void i18n.changeLanguage(lang);
    }
}

export default i18n;