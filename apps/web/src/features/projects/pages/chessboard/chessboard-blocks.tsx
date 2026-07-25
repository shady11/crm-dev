import {useNavigate, useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {Card, CardContent} from "@/components/ui/card.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Project} from "@/features/projects/types/project.types.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {
    Building2Icon,
    BuildingIcon,
    HouseIcon,
    Layers2Icon,
    Loader2Icon,
    SquareArrowRightEnterIcon
} from "lucide-react";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";

export function ChessboardBlocks() {
    const { projectId } = useParams<{ projectId: string }>();
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

    if (!tree || !tree.blocks || tree.blocks.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Building2Icon strokeWidth={1.25}/>
                    </EmptyMedia>
                    <EmptyTitle>No blocks yet</EmptyTitle>
                    <EmptyDescription>
                        Create blocks in the Builder tab first
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Select Block</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tree.blocks.map((block: Block) => {
                    const totalEntrances = block.entrances?.length || 0;
                    const totalFloors = block.entrances?.reduce((sum, e) => sum + (e.floors?.length || 0), 0) || 0;
                    const totalUnits = block.entrances?.reduce(
                        (sum, e) => sum + (e.floors?.reduce((s, f) => s + (f.units?.length || 0), 0) || 0),
                        0
                    ) || 0;

                    return (
                        <Card
                            key={block.id}
                            className="cursor-pointer border border-secondary shadow-none"
                            onClick={() => navigate(`./${block.id}`)}
                        >
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-primary p-3">
                                            <BuildingIcon size={32} strokeWidth={1.25} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium">Block {block.name}</h3>
                                            {(block as any).code && (
                                                <p className="text-xs text-muted-foreground">{(block as any).code}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4"/>

                                <div className="flex item-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-muted p-2">
                                            <SquareArrowRightEnterIcon size={20} strokeWidth={1.5} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Entrances</p>
                                            <span className="text-md font-medium">{totalEntrances}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-muted p-2">
                                            <Layers2Icon size={20} strokeWidth={1.5} className="text-rose-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Floors</p>
                                            <span className="text-md font-medium">{totalFloors}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-muted p-2">
                                            <HouseIcon size={20} strokeWidth={1.5} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Units</p>
                                            <span className="text-md font-medium">{totalUnits}</span>
                                        </div>
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