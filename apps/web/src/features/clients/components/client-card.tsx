import {cn} from "@/lib/utils";
import {Item, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item";
import type {Client} from "@/features/clients/types/client.types.ts";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/clients/utils/format.ts";

interface ClientCardProps {
    client: Client;
    selected?: boolean;
    onClick?: () => void;
}

export function ClientCard({ client, selected, onClick }: ClientCardProps) {
    return (
        <Item
            variant="outline"
            className={cn("cursor-pointer border border-secondary p-3", selected && "border-2 border-primary")}
            onClick={onClick}
        >
            <ItemMedia>
                <Avatar size="sm">
                    <AvatarFallback>{initials(client.fullName)}</AvatarFallback>
                </Avatar>
            </ItemMedia>
            <ItemContent className="gap-0">
                <ItemTitle>{client.fullName}</ItemTitle>
                <ItemDescription className="text-sm mt-1">{client.phone}</ItemDescription>
            </ItemContent>
        </Item>
    );
}