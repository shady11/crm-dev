import {Link, useLocation} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {getBreadcrumbs} from "@/lib/breadcrumbs.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {SidebarTrigger} from "@/components/ui/sidebar.tsx";
import LanguageDropdown from "@/components/layout/header/language-dropdown.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useTheme} from "@/hooks/use-theme.ts";
import {Languages, MoonStar, Sun} from "lucide-react";
import {NotificationBell} from "@/features/notifications/components/notification-bell.tsx";
import {useTranslation} from "react-i18next";
import {getProject, getProjectChessboard} from "@/features/projects/api/projects.api.ts";
import {getClient} from "@/features/clients/api/clients.api.ts";
import {getDeal} from "@/features/deals/api/deals.api.ts";
import {getCompany} from "@/features/companies/api/companies.api.ts";
import {getBranch} from "@/features/branches/api/branches.api.ts";
import type {Block} from "@/features/blocks/types/block.types.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Finds the UUID `offset` positions after `segmentKey` in the path (e.g. the
// project id right after "projects" in /projects/<id>/overview), so
// breadcrumbs can resolve it to a human-readable name instead of the raw id.
function findIdAfterSegment(segments: string[], segmentKey: string, offset = 1) {
    const index = segments.indexOf(segmentKey);
    const candidate = index !== -1 ? segments[index + offset] : undefined;

    return UUID_PATTERN.test(candidate ?? "") ? candidate : undefined;
}

export function AppHeader() {

    const { t } = useTranslation("common");
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const segments = location.pathname.split("/").filter(Boolean);

    const projectId = findIdAfterSegment(segments, "projects");
    const clientId = findIdAfterSegment(segments, "clients");
    const dealId = findIdAfterSegment(segments, "deals");
    const companyId = findIdAfterSegment(segments, "companies");
    const branchId = findIdAfterSegment(segments, "branches");
    const blockId = findIdAfterSegment(segments, "chessboard", 1);
    const entranceId = findIdAfterSegment(segments, "chessboard", 2);

    const projectQuery = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => getProject(projectId!),
        enabled: !!projectId,
    });
    const clientQuery = useQuery({
        queryKey: ["client", clientId],
        queryFn: () => getClient(clientId!),
        enabled: !!clientId,
    });
    const dealQuery = useQuery({
        queryKey: ["deal", dealId],
        queryFn: () => getDeal(dealId!),
        enabled: !!dealId,
    });
    const companyQuery = useQuery({
        queryKey: ["companies", companyId],
        queryFn: () => getCompany(companyId!),
        enabled: !!companyId,
    });
    const branchQuery = useQuery({
        queryKey: ["branches", branchId],
        queryFn: () => getBranch(branchId!),
        enabled: !!branchId,
    });
    const chessboardQuery = useQuery({
        queryKey: ["project-chessboard", projectId],
        queryFn: () => getProjectChessboard(projectId!),
        enabled: !!projectId && !!blockId,
    });

    const blocks = (chessboardQuery.data?.blocks ?? []) as Block[];
    const block = blocks.find((b) => b.id === blockId);
    const entrance = block?.entrances.find((e) => e.id === entranceId);

    const entityNames: Record<string, string> = {};
    if (projectId && projectQuery.data) entityNames[projectId] = projectQuery.data.name;
    if (clientId && clientQuery.data) entityNames[clientId] = clientQuery.data.fullName;
    if (dealId && dealQuery.data) entityNames[dealId] = dealQuery.data.dealNumber;
    if (companyId && companyQuery.data) entityNames[companyId] = companyQuery.data.name;
    if (branchId && branchQuery.data) entityNames[branchId] = branchQuery.data.name;
    if (blockId && block) entityNames[blockId] = block.name;
    if (entranceId && entrance) entityNames[entranceId] = entrance.name;

    const breadcrumbs = getBreadcrumbs(location.pathname, t, entityNames);

    return (
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 bg-background border-b-2 z-50">
            <div className="flex items-center gap-2">

                <SidebarTrigger aria-label={t("nav.toggleSidebar")} />
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
                        <Button variant="ghost" size="icon-md" title={t("language.switchLabel")}>
                            <Languages />
                        </Button>
                    }
                />
                <Button
                    variant="ghost"
                    size="icon-md"
                    onClick={toggleTheme}
                    title={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
                >
                    {theme === "dark" ? <Sun /> : <MoonStar />}
                </Button>
            </div>
        </header>
    );
}