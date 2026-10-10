import {NavLink} from "react-router-dom";
import {cn} from "@/lib/utils";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";

export function ProjectTabs() {
    const { t } = useTranslation("common");
    const { user } = useAuth();

    const tabs = [
        { label: t("nav.overview"), to: "overview" },
        // Editing blocks, floors and units; the chessboard is the read view.
        ...(hasPermission(user, "inventory.manage") ? [{ label: t("nav.builder"), to: "builder" }] : []),
        { label: t("nav.chessboard"), to: "chessboard" },
        // "sales" is routed but still a "coming soon" placeholder, so it stays out of the tabs until it exists.
    ];

    return (
        <div className="container-fluid border-b-2 border-secondary">
            <nav className="flex gap-3">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        // The chessboard tab stays lit inside its block and entrance pages.
                        end={tab.to !== "chessboard"}
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