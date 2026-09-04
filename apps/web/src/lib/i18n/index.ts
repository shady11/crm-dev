import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEn from "./locales/en/common.json";
import dealsEn from "./locales/en/deals.json";
import unitsEn from "./locales/en/units.json";
import projectsEn from "./locales/en/projects.json";
import paymentsEn from "./locales/en/payments.json";
import usersEn from "./locales/en/users.json";
import documentsEn from "./locales/en/documents.json";
import leadsEn from "./locales/en/leads.json";
import tasksEn from "./locales/en/tasks.json";

import commonRu from "./locales/ru/common.json";
import dealsRu from "./locales/ru/deals.json";
import unitsRu from "./locales/ru/units.json";
import projectsRu from "./locales/ru/projects.json";
import paymentsRu from "./locales/ru/payments.json";
import usersRu from "./locales/ru/users.json";
import documentsRu from "./locales/ru/documents.json";
import leadsRu from "./locales/ru/leads.json";
import tasksRu from "./locales/ru/tasks.json";

export const resources = {
    en: {
        common: commonEn,
        deals: dealsEn,
        units: unitsEn,
        projects: projectsEn,
        payments: paymentsEn,
        users: usersEn,
        documents: documentsEn,
        leads: leadsEn,
        tasks: tasksEn,
    },
    ru: {
        common: commonRu,
        deals: dealsRu,
        units: unitsRu,
        projects: projectsRu,
        payments: paymentsRu,
        users: usersRu,
        documents: documentsRu,
        leads: leadsRu,
        tasks: tasksRu,
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

        // i18next silently renders the raw key on a miss - it never throws.
        // In dev, log it instead of finding out from a support ticket; this is
        // exactly the class of bug check-locales.mjs catches in CI, but that
        // only sees keys referenced from a *_LABEL_KEYS map, not every t() call.
        saveMissing: import.meta.env.DEV,
        missingKeyHandler: import.meta.env.DEV
            ? (languages, ns, key) => {
                  console.warn(`[i18n] missing key "${key}" in namespace "${ns}" for ${languages.join(", ")}`);
              }
            : undefined,

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