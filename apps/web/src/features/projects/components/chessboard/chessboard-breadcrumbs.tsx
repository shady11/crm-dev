import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
} from "@/components/ui/breadcrumb";
import {
    Menu,
    MenuContent,
    MenuGroup,
    MenuItem,
    MenuTrigger,
} from "@/components/ui/menu";
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";
import type { Block } from "@/features/blocks/types/block.types";
import type { Entrance } from "@/features/entrances/types/entrance.types";
import {useTranslation} from "react-i18next";

interface ChessboardBreadcrumbsProps {
    block: Block;
    entrance: Entrance;
    blocks: Block[];
    blockEntrances: Entrance[];
    onBack(): void;
    onBlockSelect(blockId: string): void;
    onEntranceSelect(entranceId: string): void;
}

export function ChessboardBreadcrumbs({
                                                block,
                                                entrance,
                                                blocks,
                                                blockEntrances,
                                                onBack,
                                                onBlockSelect,
                                                onEntranceSelect,
                                            }: ChessboardBreadcrumbsProps) {
    const { t } = useTranslation("projects");

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Button variant="outline" size="icon-sm" onClick={onBack}>
                            <ArrowLeftIcon className="size-3" />
                        </Button>
                    </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbItem>
                    <Menu>
                        <MenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex gap-2 font-medium">
                                {t("chessboard.blockLabel", { name: block.name })}
                                <ChevronDownIcon className="size-3" />
                            </Button>
                        </MenuTrigger>
                        <MenuContent>
                            <MenuGroup>
                                {blocks.map((item) => (
                                    <MenuItem
                                        key={item.id}
                                        value={item.id}
                                        onClick={() => onBlockSelect(item.id)}
                                    >
                                        {t("chessboard.blockLabel", { name: item.name })}
                                    </MenuItem>
                                ))}
                            </MenuGroup>
                        </MenuContent>
                    </Menu>
                </BreadcrumbItem>

                <BreadcrumbItem>
                    <Menu>
                        <MenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex gap-2 font-medium">
                                {t("chessboard.entranceLabel", { name: entrance.name })}
                                <ChevronDownIcon className="size-3" />
                            </Button>
                        </MenuTrigger>
                        <MenuContent>
                            <MenuGroup>
                                {blockEntrances.map((item) => (
                                    <MenuItem
                                        key={item.id}
                                        value={item.id}
                                        onClick={() => onEntranceSelect(item.id)}
                                    >
                                        {t("chessboard.entranceLabel", { name: item.name })}
                                    </MenuItem>
                                ))}
                            </MenuGroup>
                        </MenuContent>
                    </Menu>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
}