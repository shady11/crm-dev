import type {TFunction} from "i18next";

// The built-in roles' names as the API stores them (shared by every
// company, see default-role-permissions.ts), and their translations.
const BUILT_IN_ROLE_KEYS: Record<string, string> = {
    "Super Admin": "users:role.super_admin",
    "Company Admin": "users:role.company_admin",
    "Sales Head": "users:role.sales_head",
    "Sales Manager": "users:role.sales_manager",
    "Finance": "users:role.finance",
};

/**
 * A role's name in the reader's language. Built-in roles are stored with
 * English names, which the Russian and Kyrgyz app showed as they were
 * ("Sales Manager" on the users list, the deal card, the role picker).
 * A company's own roles keep the name the company gave them.
 */
export function roleLabel(t: TFunction, name: string | null | undefined): string {
    if (!name) return "";
    const key = BUILT_IN_ROLE_KEYS[name];
    return key ? (t(key) as string) : name;
}
