import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {Mail, PhoneIcon} from "lucide-react";

export function DealClientCard({ client }: { client: Deal["client"] }) {
    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title="Client Details" className="py-4 border-b gap-0"></CardHeader>
            <CardContent className="flex gap-4">
                <Avatar className="size-10">
                    <AvatarFallback>{initials(client.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-medium">{client.fullName}</h3>

                    <div className="flex flex-col gap-1 text-muted-foreground">
                        <a
                            href={`mailto:${client.email}`}
                            className="flex items-center gap-2 text-sm hover:text-foreground"
                        >
                            <Mail size={14} />
                            {client.email}
                        </a>

                        <a
                            href={`tel:${client.phone}`}
                            className="flex items-center gap-2 text-sm hover:text-foreground"
                        >
                            <PhoneIcon size={14} />
                            {client.phone}
                        </a>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}