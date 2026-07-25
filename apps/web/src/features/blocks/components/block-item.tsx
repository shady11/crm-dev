import {Building} from "lucide-react";
import {Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {EditBlockButton} from "./edit-block-button.tsx";
import {DeleteBlockButton} from "./delete-block-button.tsx";
import {AddEntranceButton} from "@/features/entrances/components/add-entrance-button.tsx";
import {EntranceItem} from "@/features/entrances/components/entrance-item.tsx";
import {DuplicateBlockButton} from "@/features/blocks/components/duplicate-block-button.tsx";

interface BlockItemProps {
    block: Block;
    isExpanded: boolean;
    onToggle: () => void;
}

export function BlockItem({ block, isExpanded, onToggle }: BlockItemProps) {
    return (
        <div>
            <Item
                variant="default"
                className="items-center border border-secondary p-4 cursor-pointer"
                onClick={onToggle}
            >
                <ItemMedia
                    variant="icon"
                    className="h-full"
                >
                    <Building className="size-8" strokeWidth={1.25} />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Block {block.name}</ItemTitle>
                    <ItemDescription>{block.entrances.length} entrances</ItemDescription>
                </ItemContent>
                <ItemActions onClick={(e) => e.stopPropagation()}>
                    <AddEntranceButton
                        block={block}
                    />
                    <DuplicateBlockButton block={block} />
                    <EditBlockButton block={block} />
                    <DeleteBlockButton block={block} />
                </ItemActions>
            </Item>

            {isExpanded && (
                <div className="px-6 mt-2 space-y-2">
                    {block.entrances.map((entrance: Entrance) => (
                        <EntranceItem
                            key={entrance.id}
                            entrance={entrance}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}