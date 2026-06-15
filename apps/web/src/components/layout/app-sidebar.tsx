import {
    Building2,
    LayoutDashboard,
    Users,
    UserRound,
    Boxes,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
    {
        title: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Leads",
        href: "/app/leads",
        icon: UserRound,
    },
    {
        title: "Clients",
        href: "/app/clients",
        icon: Users,
    },
    {
        title: "Projects",
        href: "/app/projects",
        icon: Building2,
    },
    {
        title: "Units",
        href: "/app/units",
        icon: Boxes,
    },
];

export function AppSidebar() {
    return (
        <aside className="hidden w-64 shrink-0 border-r bg-muted/20 md:block">
            <div className="h-16 border-b px-6 flex items-center">
                <div>
                    <div className="font-semibold">CRM Dev</div>
                    <div className="text-xs text-muted-foreground">
                        Real Estate SaaS
                    </div>
                </div>
            </div>

            <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                [
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                ].join(" ")
                            }
                        >
                            <Icon className="h-4 w-4" />
                            {item.title}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}