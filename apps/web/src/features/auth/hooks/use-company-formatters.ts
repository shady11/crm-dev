import {useFormatters} from "@/lib/i18n/formatters.ts";
import {useAuth} from "./use-auth";

/**
 * useFormatters() bound to the signed-in user's own company. Without this,
 * every call site either had to thread a `companySettings` prop down by hand
 * (nobody did) or fell back to the KGS/ru-RU defaults regardless of what the
 * company actually has configured.
 */
export function useCompanyFormatters() {
    const {user} = useAuth();
    return useFormatters(user?.company ?? undefined);
}
