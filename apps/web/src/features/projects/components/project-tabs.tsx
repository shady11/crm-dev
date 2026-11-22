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
        // Same look as the page-level tabs elsewhere: a glass track with the
        // active tab on a white pill.
        <div className="max-w-full overflow-x-auto">
            <nav className="seg-surface inline-flex gap-1 rounded-[11px] p-[4px]">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        // The chessboard tab stays lit inside its block and entrance pages.
                        end={tab.to !== "chessboard"}
                        className={({ isActive }) =>
                            cn(
                                "inline-flex h-9 items-center rounded-[8px] px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
                                "hover:text-foreground",
                                isActive && "seg-thumb text-foreground"
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