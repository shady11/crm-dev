const TOKEN_KEY = "crm_access_token";
// Session-scoped (not localStorage): the SUPER_ADMIN's own token is stashed
// here only for the lifetime of an impersonation, so it never survives a
// closed tab/browser the way the active token deliberately does.
const IMPERSONATOR_TOKEN_KEY = "crm_impersonator_token";
// Where to take the platform admin back to when the impersonation ends.
const IMPERSONATION_RETURN_KEY = "crm_impersonation_return";
// A one-off message for the next page, set when a session ends on its own.
const FLASH_KEY = "crm_auth_flash";

export const authStorage = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken(token: string) {
        localStorage.setItem(TOKEN_KEY, token);
    },

    clear() {
        localStorage.removeItem(TOKEN_KEY);
    },

    // Called right before swapping the active token to an impersonated one,
    // so "Exit" can restore the SUPER_ADMIN's own session without a full
    // re-login.
    stashImpersonatorToken(token: string, returnTo?: string) {
        sessionStorage.setItem(IMPERSONATOR_TOKEN_KEY, token);
        if (returnTo) sessionStorage.setItem(IMPERSONATION_RETURN_KEY, returnTo);
    },

    getImpersonationReturn() {
        return sessionStorage.getItem(IMPERSONATION_RETURN_KEY);
    },

    setFlash(key: string) {
        sessionStorage.setItem(FLASH_KEY, key);
    },

    /** The pending message key, removed as it is read. */
    takeFlash() {
        const key = sessionStorage.getItem(FLASH_KEY);
        sessionStorage.removeItem(FLASH_KEY);
        return key;
    },

    getImpersonatorToken() {
        return sessionStorage.getItem(IMPERSONATOR_TOKEN_KEY);
    },

    clearImpersonatorToken() {
        sessionStorage.removeItem(IMPERSONATOR_TOKEN_KEY);
        sessionStorage.removeItem(IMPERSONATION_RETURN_KEY);
    },
};