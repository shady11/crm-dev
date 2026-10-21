import {isAxiosError} from "axios";
import type {TFunction} from "i18next";
import {apiErrorMessage} from "@/lib/api-error.ts";

/**
 * SA-4: what the company form says when saving fails. The two conflicts the
 * API can report are translated; anything else is shown as the API says it.
 */
export function companyFormError(error: Error, t: TFunction<"companies">, isEdit: boolean): string {
    const message = apiErrorMessage(error);
    if (isAxiosError<{code?: string; companyName?: string}>(error) && error.response?.data?.code === "EMAIL_IN_DELETED_COMPANY") {
        return t("form.errors.emailInDeletedCompany", {name: error.response.data.companyName ?? ""});
    }
    if (isAxiosError(error) && error.response?.status === 409) {
        if (message?.includes("email")) return t("form.errors.emailTaken");
        if (message?.includes("name")) return t("form.errors.nameTaken");
    }
    return message ?? (isEdit ? t("page.toasts.updateError") : t("page.toasts.createError"));
}
