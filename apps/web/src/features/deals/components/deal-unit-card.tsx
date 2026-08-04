import {HouseIcon} from "lucide-react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {UNIT_TYPE_LABELS} from "@/features/units/types/unit.types.ts";

export function DealUnitCard({ unit, project }: { unit: Deal["unit"]; project: Deal["project"] }) {
    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title="Unit Details" className="py-4 border-b gap-0"></CardHeader>
            <CardContent className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-2.5">
                        <HouseIcon size={24} strokeWidth={1.25} className="text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-medium">Unit №{unit.number}</h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {project.name}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.block && `Block ${unit.block.name}`}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.entrance && `Entrance ${unit.entrance.name}`}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.floor && `Floor ${unit.floor.number}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center text-center gap-4">
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Type
                        </p>
                        <p className="font-medium">
                            {UNIT_TYPE_LABELS[unit.type]}
                        </p>
                    </div>
                    {unit.rooms != null && (
                        <div className="border border-dashed p-2 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Rooms
                            </p>
                            <p className="font-medium">
                                {unit.rooms}
                            </p>
                        </div>
                    )}
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Area
                        </p>
                        <p className="text-sm font-medium">
                            {unit.area.toFixed(1)} m²
                        </p>
                    </div>
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Price
                        </p>
                        <p className="text-sm font-medium">
                            {unit.price.toLocaleString("ru-RU")} $
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}