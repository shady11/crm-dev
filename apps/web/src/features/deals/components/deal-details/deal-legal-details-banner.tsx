import {ScrollTextIcon} from "lucide-react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";

/**
 * CA-4: a contract or receipt generated now would print the display name and
 * an empty signature line for whatever legal detail is still blank. Says so
 * next to the Generate menu, and links an admin straight to the form.
 */
export function DealLegalDetailsBanner() {
    const {t} = useTranslation("deals");
    const {user} = useAuth();
    const missing = user?.company?.missingLegalDetails ?? [];

    if (missing.length === 0) return null;

    const canEdit = hasPermission(user, "company_settings.edit");
    const fields = missing.map((field) => t(`legalDetailsBanner.fields.${field}`)).join(", ");

    return (
        <Alert variant="warning">
            <ScrollTextIcon />
            <AlertTitle>{t("legalDetailsBanner.title")}</AlertTitle>
            <AlertDescription>
                {t(canEdit ? "legalDetailsBanner.descriptionAdmin" : "legalDetailsBanner.description", {fields})}
            </AlertDescription>
            {canEdit && (
                <AlertAction>
                    <Button size="sm" variant="outline" asChild>
                        <Link to="/settings?section=legal">{t("legalDetailsBanner.action")}</Link>
                    </Button>
                </AlertAction>
            )}
        </Alert>
    );
}
