import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {type Unit,} from "@/features/units/types/unit.types.ts";
import {DealCard} from "@/features/deals/components/deal-card.tsx";
import {UnitOverview} from "@/features/units/components/unit-overview.tsx";
import {useUnit} from "@/features/units/hooks/use-unit.ts";

interface UnitDetailsSheetProps {
    unit: Unit | null;
    floor: Floor | null;

    open: boolean;

    onOpenChange(open: boolean): void;
    onEdit(): void;
    onBook(): void;
}

export function UnitDetailsSheet({
                                     unit,
                                     floor,
                                     open,
                                     onOpenChange,
                                     onEdit,
                                     onBook,
                                 }: UnitDetailsSheetProps) {

    const unitDetailsQuery = useUnit(open ? unit?.id : undefined);
    const fullUnit = unitDetailsQuery.data ?? unit;

    if (!unit || !floor) {
        return null;
    }

    const deals = fullUnit?.deals ?? [];

    return (
        <Sheet open={open} onOpenChange={({ open }) => onOpenChange(open)}>
            <SheetContent className="sm:max-w-lg" variant="inset">
                <SheetHeader>
                    <SheetTitle>Unit №{unit.number}</SheetTitle>
                </SheetHeader>

                <SheetBody scrollFade>
                    <div className="py-4">
                        <Tabs defaultValue="overview" className="gap-6">
                            <TabsList>
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="deals">
                                    Deals{deals.length > 0 && ` (${deals.length})`}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <UnitOverview unit={unit} floor={floor} />
                            </TabsContent>

                            <TabsContent value="deals">
                                {deals.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        No deals recorded for this unit yet.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {deals.map((deal) => (
                                            <DealCard key={deal.id} deal={deal} />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </SheetBody>

                <SheetFooter>
                    <Button variant="secondary" className="flex-1" onClick={onEdit}>
                        Edit
                    </Button>
                    {unit.status === "AVAILABLE" && (
                        <Button className="flex-1" onClick={onBook}>
                            Book
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}