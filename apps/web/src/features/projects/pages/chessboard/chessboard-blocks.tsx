import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Project} from "@/features/projects/types/project.types.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {
    Building2Icon, BuildingIcon,
    HouseIcon,
    Layers2Icon,
    Loader2Icon, SquareArrowRightEnterIcon
} from "lucide-react";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";

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
            <div className="flex h-96 items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Building2Icon className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">No blocks yet</p>
                    <p className="text-sm">Create blocks in the Builder tab first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Select Block</h2>
                <p className="text-sm text-muted-foreground">Choose a block to view its chessboard</p>
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
                            className="cursor-pointer ring-0 border-0 bg-card shadow-sm"
                            onClick={() => navigate(`./${block.id}`)}
                        >
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-primary p-3">
                                            <BuildingIcon size={32} strokeWidth={1.25} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Block {block.name}</h3>
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