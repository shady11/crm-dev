type Breadcrumb = {
    label: string;
    href?: string;
};

const routeMap: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Leads",
    clients: "Clients",
    projects: "Projects",
    units: "Units",
    chessboard: "Chessboard",
    settings: "Settings",
};

export function getBreadcrumbs(pathname: string): Breadcrumb[] {
    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs: Breadcrumb[] = [];

    let path = "";

    for (const segment of segments) {
        path += `/${segment}`;

        const label = routeMap[segment] ?? segment;

        breadcrumbs.push({
            label,
            href: path,
        });
    }

    return breadcrumbs;
}