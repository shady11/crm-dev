import {NavLink} from "react-router-dom";
import {cn} from "@/lib/utils";
import {useTranslation} from "react-i18next";

export function ProjectTabs() {
    const { t } = useTranslation("common");

    const tabs = [
        { label: t("nav.overview"), to: "overview" },
        { label: t("nav.builder"), to: "builder" },
        { label: t("nav.chessboard"), to: "chessboard" },
        { label: t("nav.sales"), to: "sales" },
    ];

    return (
        <div className="container-fluid border-b-2 border-secondary">
            <nav className="flex gap-3">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end
                        className={({ isActive }) =>
                            cn(
                                "relative inline-flex items-center px-2.5 py-4 text-md font-medium text-muted-foreground transition-colors",
                                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform",
                                isActive && [
                                    "text-primary",
                                    "after:scale-x-100",
                                ]
                            )
                        }
                    >
                        {tab.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}