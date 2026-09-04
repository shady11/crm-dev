import {useEffect} from "react";
import {useQuery} from "@tanstack/react-query";
import {getMe} from "../api/auth.api";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {setCompanyLocale} from "@/lib/i18n";

export function useAuth() {
    const token = authStorage.getToken();

    const query = useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        enabled: !!token,
        staleTime: 1000 * 60 * 10, // 10 min
    });

    const locale = query.data?.company?.locale;

    // Switches the UI language to match the signed-in user's own company,
    // rather than whatever the browser guessed. Runs once per fetched
    // AuthUser (setCompanyLocale itself no-ops if it's already the current
    // language), so it stays in sync across logout/login as different
    // companies' users sign in on the same machine.
    useEffect(() => {
        setCompanyLocale(locale);
    }, [locale]);

    return {
        user: query.data,
        isLoading: query.isLoading,
        isAuthenticated: !!query.data,
    };
}