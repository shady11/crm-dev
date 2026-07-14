import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    ChevronDownIcon,
    ArrowLeftIcon, Loader2Icon, Building2Icon, DoorOpenIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import type {Project} from "@/features/projects/types/project.types.ts";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList
} from "@/components/ui/breadcrumb.tsx";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";

export function ChessboardEntrances() {
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
                    <p className="text-lg font-medium">Block not found</p>
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex gap-3">
                                    Block {block.name}
                                    <ChevronDownIcon className="size-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuGroup>
                                    {blocks.map((block) => (
                                        <DropdownMenuItem onClick={() => navigate(`../${block.id}`)}>Block {block.name}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                            className="cursor-pointer ring-0 border-0 bg-card shadow-sm"
                            onClick={() => navigate(`./${entrance.id}`)}
                        >
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-muted p-2.5">
                                        <DoorOpenIcon size={32} strokeWidth={1.25} className="text-primary"/>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Entrance {entrance.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {totalFloors} floor{totalFloors !== 1 ? 's' : ''} • {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
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