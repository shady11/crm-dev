const TOKEN_KEY = "crm_access_token";
// Session-scoped (not localStorage): the SUPER_ADMIN's own token is stashed
// here only for the lifetime of an impersonation, so it never survives a
// closed tab/browser the way the active token deliberately does.
const IMPERSONATOR_TOKEN_KEY = "crm_impersonator_token";

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
    stashImpersonatorToken(token: string) {
        sessionStorage.setItem(IMPERSONATOR_TOKEN_KEY, token);
    },

    getImpersonatorToken() {
        return sessionStorage.getItem(IMPERSONATOR_TOKEN_KEY);
    },

    clearImpersonatorToken() {
        sessionStorage.removeItem(IMPERSONATOR_TOKEN_KEY);
    },
};