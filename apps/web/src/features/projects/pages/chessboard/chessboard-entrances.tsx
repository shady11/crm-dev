import {useNavigate, useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {ArrowLeftIcon, Building2Icon, ChevronDownIcon, DoorOpenIcon, Loader2Icon} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {Project} from "@/features/projects/types/project.types.ts";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList} from "@/components/ui/breadcrumb.tsx";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";
import {Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger} from "@/components/ui/menu.tsx";
import {useTranslation} from "react-i18next";

export function ChessboardEntrances() {
    const { t } = useTranslation("projects");
    const { projectId, blockId } = useParams<{ projectId: string; blockId: string }>();
    const navigate = useNavigate();

    const treeQuery = useQuery({
        queryKey: ["project-tree", projectId],
        queryFn: () => getProjectTree(projectId!),
        enabled: !!projectId,
    });

    if (treeQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const tree = treeQuery.data as Project | undefined;
    const block = tree?.blocks?.find((b: Block) => b.id === blockId);

    const blocks = tree?.blocks || [];

    if (!block) {
        return (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Building2Icon className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">{t("chessboard.blockNotFound")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Button variant="outline" size="icon-sm" onClick={() => navigate("..")}>
                                <ArrowLeftIcon className="size-3" />
                            </Button>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                        <Menu>
                            <MenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex gap-3 font-medium">
                                    {t("chessboard.blockLabel", { name: block.name })}
                                    <ChevronDownIcon className="size-3" />
                                </Button>
                            </MenuTrigger>
                            <MenuContent>
                                <MenuGroup>
                                    {blocks.map((block, index) => (
                                        <MenuItem value={`block-${index}`} onClick={() => navigate(`../${block.id}`)}>{t("chessboard.blockLabel", { name: block.name })}</MenuItem>
                                    ))}
                                </MenuGroup>
                            </MenuContent>
                        </Menu>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Entrances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {block.entrances?.map((entrance: Entrance) => {
                    const totalFloors = entrance.floors?.length || 0;
                    const totalUnits = entrance.floors?.reduce((sum, f) => sum + (f.units?.length || 0), 0) || 0;

                    return (
                        <Card
                            key={entrance.id}
                            className="cursor-pointer border border-secondary shadow-none"
                            onClick={() => navigate(`./${entrance.id}`)}
                        >
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-muted p-2.5">
                                        <DoorOpenIcon size={32} strokeWidth={1.25} className="text-primary"/>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">{t("chessboard.entranceLabel", { name: entrance.name })}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("chessboard.floors", { count: totalFloors })} • {t("chessboard.units", { count: totalUnits })}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}