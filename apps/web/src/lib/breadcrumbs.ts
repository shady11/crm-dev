type Breadcrumb = {
    label: string;
    href?: string;
};

// Values are keys into the "common:nav" namespace, not labels themselves -
// getBreadcrumbs takes a translate function so this stays correct in
// whichever language is active, instead of being frozen in English the way
// the sidebar's own labels were before this pass.
const ROUTE_LABEL_KEYS: Record<string, string> = {
    dashboard: "nav.dashboard",
    leads: "nav.leads",
    clients: "nav.clients",
    projects: "nav.projects",
    chessboard: "nav.chessboard",
    deals: "nav.deals",
    tasks: "nav.tasks",
    users: "nav.users",
    companies: "nav.companies",
    overview: "nav.overview",
    builder: "nav.builder",
    sales: "nav.sales",
};

export function getBreadcrumbs(pathname: string, t: (key: string) => string): Breadcrumb[] {
    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs: Breadcrumb[] = [];

    let path = "";

    for (const segment of segments) {
        path += `/${segment}`;

        const key = ROUTE_LABEL_KEYS[segment];
        const label = key ? t(key) : segment;

        breadcrumbs.push({
            label,
            href: path,
        });
    }

    return breadcrumbs;
}
