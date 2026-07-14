import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {Building2, Loader2, Plus} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { createBlock } from "@/features/blocks/api/blocks.api";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {ProjectTree} from "@/features/projects/types/project.types.ts";
import {BlockItem} from "@/features/blocks/components/block-item.tsx";
import {BlockForm} from "@/features/blocks/components/block-form.tsx";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {toast} from "@/components/ui/toast";

export function ProjectStructure() {
    const { projectId } = useParams<{ projectId: string }>();
    const queryClient = useQueryClient();

    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const [open, setOpen] = useState(false);

    const treeQuery = useQuery({
        queryKey: ["project-tree", projectId],
        queryFn: () => getProjectTree(projectId!),
        enabled: !!projectId,
    });

    const createBlockMutation = useMutation({
        mutationFn: (payload: { name: string; code?: string }) =>
            createBlock(projectId!, payload),

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["project-tree", projectId],
            });

            await queryClient.invalidateQueries({
                queryKey: ["project", projectId],
            });

            toast.success({
                title: "Successfully created",
                description: `Block ${variables.name} has been added to the project.`,
            });

            setOpen(false);
        },

        onError: () => {
            toast.error({
                title: "Failed to create block",
                description: "Please try again.",
            });
        },
    });

    const toggleBlock = (blockId: string) => {
        const next = new Set(expandedBlocks);
        if (next.has(blockId)) {
            next.delete(blockId);
        } else {
            next.add(blockId);
        }
        setExpandedBlocks(next);
    };

    if (treeQuery.isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
        );
    }

    if (!treeQuery.data) {
        return <div className="p-6 text-center font-medium">Project structure not found</div>;
    }

    const tree = treeQuery.data as ProjectTree;

    const nextBlockOrder =
        Math.max(
            0,
            ...(tree.blocks ?? []).map((b) => Number(b.order) || 0)
        ) + 1;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Project Structure</h2>
                <Button size="sm" variant="default" onClick={() => setOpen(true)}>
                    <Plus className="size-3" />
                    Add Block
                </Button>
            </div>

            <div className="space-y-4">
                {tree.blocks.length > 0 ? (
                    tree.blocks.map((block: Block) => (
                        <BlockItem
                            key={block.id}
                            block={block}
                            isExpanded={expandedBlocks.has(block.id)}
                            onToggle={() => toggleBlock(block.id)}
                        />
                    ))
                ) : (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Building2 strokeWidth={1.25}/>
                            </EmptyMedia>
                            <EmptyTitle>No blocks yet</EmptyTitle>
                            <EmptyDescription>
                                Get started by creating your first block. <br/>
                                Blocks help you organize entrances, floors, and units in your project.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent className="flex-row justify-center gap-2">
                            <Button size="sm" onClick={() => setOpen(true)}>
                                <Plus className="size-3" />
                                Add Block
                            </Button>
                        </EmptyContent>
                    </Empty>
                )}
            </div>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent variant="inset" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Create block</SheetTitle>
                    </SheetHeader>
                    <BlockForm
                        key={`block-new-${open ? "open" : "closed"}`}
                        defaultOrder={nextBlockOrder}
                        errorMessage={
                            createBlockMutation.isError
                                ? "Block could not be saved. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={createBlockMutation.isPending}
                        submitLabel="Create block"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createBlockMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}