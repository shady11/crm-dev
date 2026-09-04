import {Status} from "@/components/ui/status.tsx";
import {useTranslation} from "react-i18next";

export function UserStatusDot({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation("users");

    return (
        <div className="flex items-center gap-1.5 text-sm font-medium">
            <Status size="sm" variant="default" className={isActive ? "bg-emerald-500" : "bg-gray-400"} />
            <span className={isActive ? "text-emerald-600" : "text-muted-foreground"}>
                {isActive ? t("status.active") : t("status.inactive")}
            </span>
        </div>
    );
}