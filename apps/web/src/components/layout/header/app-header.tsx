import {Link, useLocation} from "react-router-dom";
import {getBreadcrumbs} from "@/lib/breadcrumbs.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {SidebarTrigger} from "@/components/ui/sidebar.tsx";
import LanguageDropdown from "@/components/layout/header/language-dropdown.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useTheme} from "@/hooks/use-theme.ts";
import {Languages, MoonStar, Sun} from "lucide-react";
import {NotificationBell} from "@/features/notifications/components/notification-bell.tsx";

export function AppHeader() {

    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const breadcrumbs = getBreadcrumbs(location.pathname);

    return (
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 bg-background border-b-2 z-50">
            <div className="flex items-center gap-2">

                <SidebarTrigger/>
                <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />

                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return (
                        <div key={crumb.href} className="flex items-center gap-2">
                            {index > 0 && <Separator orientation="vertical" className="h-4" />}

                            {isLast ? (
                                <span className="text-sm font-medium text-foreground">
                                  {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    to={crumb.href!}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    {crumb.label}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <NotificationBell />
                <LanguageDropdown
                    trigger={
                        <Button variant="ghost" size="icon-md">
                            <Languages />
                        </Button>
                    }
                />
                <Button
                    variant="ghost"
                    size="icon-md"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                    {theme === "dark" ? <Sun /> : <MoonStar />}
                </Button>
            </div>
        </header>
    );
}