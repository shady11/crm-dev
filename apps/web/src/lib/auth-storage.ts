const TOKEN_KEY = "crm_access_token";

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
};