import {Badge} from "@/components/ui/badge.tsx";
import {useTranslation} from "react-i18next";

/** Active or inactive, as a soft pill with a dot like the other status badges. */
export function UserStatusDot({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation("users");

    return (
        <Badge className={isActive ? "bg-emerald-500" : "bg-gray-400"}>
            {isActive ? t("status.active") : t("status.inactive")}
        </Badge>
    );
}
