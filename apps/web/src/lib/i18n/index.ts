import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEn from "./locales/en/common.json";
import dealsEn from "./locales/en/deals.json";
import unitsEn from "./locales/en/units.json";
import projectsEn from "./locales/en/projects.json";
import paymentsEn from "./locales/en/payments.json";
import usersEn from "./locales/en/users.json";
import branchesEn from "./locales/en/branches.json";
import companiesEn from "./locales/en/companies.json";
import documentsEn from "./locales/en/documents.json";
import notificationsEn from "./locales/en/notifications.json";
import authEn from "./locales/en/auth.json";
import leadsEn from "./locales/en/leads.json";
import tasksEn from "./locales/en/tasks.json";
import dashboardEn from "./locales/en/dashboard.json";
import clientsEn from "./locales/en/clients.json";
import blocksEn from "./locales/en/blocks.json";
import entrancesEn from "./locales/en/entrances.json";
import floorsEn from "./locales/en/floors.json";
import auditLogEn from "./locales/en/auditLog.json";
import settingsEn from "./locales/en/settings.json";
import settingOptionsEn from "./locales/en/settingOptions.json";

import commonRu from "./locales/ru/common.json";
import dealsRu from "./locales/ru/deals.json";
import unitsRu from "./locales/ru/units.json";
import projectsRu from "./locales/ru/projects.json";
import paymentsRu from "./locales/ru/payments.json";
import usersRu from "./locales/ru/users.json";
import branchesRu from "./locales/ru/branches.json";
import companiesRu from "./locales/ru/companies.json";
import documentsRu from "./locales/ru/documents.json";
import notificationsRu from "./locales/ru/notifications.json";
import authRu from "./locales/ru/auth.json";
import leadsRu from "./locales/ru/leads.json";
import tasksRu from "./locales/ru/tasks.json";
import dashboardRu from "./locales/ru/dashboard.json";
import clientsRu from "./locales/ru/clients.json";
import blocksRu from "./locales/ru/blocks.json";
import entrancesRu from "./locales/ru/entrances.json";
import floorsRu from "./locales/ru/floors.json";
import auditLogRu from "./locales/ru/auditLog.json";
import settingsRu from "./locales/ru/settings.json";
import settingOptionsRu from "./locales/ru/settingOptions.json";

export const resources = {
    en: {
        common: commonEn,
        deals: dealsEn,
        units: unitsEn,
        projects: projectsEn,
        payments: paymentsEn,
        users: usersEn,
        branches: branchesEn,
        companies: companiesEn,
        documents: documentsEn,
        notifications: notificationsEn,
        auth: authEn,
        leads: leadsEn,
        tasks: tasksEn,
        dashboard: dashboardEn,
        clients: clientsEn,
        blocks: blocksEn,
        entrances: entrancesEn,
        floors: floorsEn,
        auditLog: auditLogEn,
        settings: settingsEn,
        settingOptions: settingOptionsEn,
    },
    ru: {
        common: commonRu,
        deals: dealsRu,
        units: unitsRu,
        projects: projectsRu,
        payments: paymentsRu,
        users: usersRu,
        branches: branchesRu,
        companies: companiesRu,
        documents: documentsRu,
        notifications: notificationsRu,
        auth: authRu,
        leads: leadsRu,
        tasks: tasksRu,
        dashboard: dashboardRu,
        clients: clientsRu,
        blocks: blocksRu,
        entrances: entrancesRu,
        floors: floorsRu,
        auditLog: auditLogRu,
        settings: settingsRu,
        settingOptions: settingOptionsRu,
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

// Languages a person can pick from the header switcher. Kyrgyz shows in the
// UI's own onboarding copy as a target market, but no ky/*.json bundle exists
// yet - offering it here would repeat the exact bug this pass fixed elsewhere
// (a switch that looks wired but silently does nothing). Add it once real
// translations exist for every namespace.
export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Sits next to i18next-browser-languagedetector's own "i18nextLng" cache key
// (see `caches` above) rather than reusing it, because that key can hold a
// language nobody chose - only setUserLanguage sets this one, so its mere
// presence means a person, not a guess or a company default, decided.
const USER_OVERRIDE_KEY = "i18n_user_language_override";

/**
 * Sets the UI language from the signed-in user's company settings. This is a
 * *default*, not a command: if the user already picked their own language
 * with the header switcher (setUserLanguage below), that choice is left
 * alone - otherwise every page reload would silently switch a user back to
 * their company's language even after they explicitly chose another one.
 */
export function setCompanyLocale(locale: string | null | undefined) {
    if (!locale) return;
    if (localStorage.getItem(USER_OVERRIDE_KEY) === "1") return;
    const lang = locale.split("-")[0]; // "ru-RU" -> "ru", matches resource keys above
    if (lang !== i18n.language) {
        void i18n.changeLanguage(lang);
    }
}

/**
 * Called only by the header language switcher. Persists the choice as an
 * explicit override so it survives reloads and future logins, and so it can
 * never again be silently overwritten by setCompanyLocale above.
 */
export function setUserLanguage(lang: SupportedLanguage) {
    localStorage.setItem(USER_OVERRIDE_KEY, "1");
    void i18n.changeLanguage(lang);
}

export default i18n;