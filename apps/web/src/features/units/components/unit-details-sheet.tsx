import {Badge} from "@/components/ui/badge.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue,} from "@/components/ui/data-list.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle,} from "@/components/ui/sheet.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {
    type Unit,
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABELS,
    UNIT_TYPE_LABELS,
} from "@/features/units/types/unit.types.ts";

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
    if (!unit || !floor) {
        return null;
    }

    return (
        <Sheet
            open={open}
            onOpenChange={({ open }) => onOpenChange(open)}
        >
            <SheetContent className="sm:max-w-sm" variant="inset">
                <SheetHeader>
                    <SheetTitle>Unit №{unit.number}</SheetTitle>
                </SheetHeader>

                <SheetBody scrollFade>
                    <div className="gap-5 py-4">
                        <DataList className="divide-y">
                            <DataListItem>
                                <DataListItemLabel>Unit number</DataListItemLabel>
                                <DataListItemValue>{unit.number}</DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Floor</DataListItemLabel>
                                <DataListItemValue>{floor.number}</DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Status</DataListItemLabel>
                                <DataListItemValue>
                                    <Badge className={`${UNIT_STATUS_CLASSES[unit.status]} text-white`}>
                                        {UNIT_STATUS_LABELS[unit.status]}
                                    </Badge>
                                </DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Type</DataListItemLabel>
                                <DataListItemValue>{UNIT_TYPE_LABELS[unit.type]}</DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Rooms</DataListItemLabel>
                                <DataListItemValue>{unit.rooms}</DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Area</DataListItemLabel>
                                <DataListItemValue>
                                    {parseFloat(unit.area).toFixed(1)} m²
                                </DataListItemValue>
                            </DataListItem>

                            <DataListItem>
                                <DataListItemLabel>Price</DataListItemLabel>
                                <DataListItemValue>
                                    {parseFloat(unit.price).toLocaleString("en-US")} $
                                </DataListItemValue>
                            </DataListItem>
                        </DataList>
                    </div>
                </SheetBody>

                <SheetFooter>
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={onEdit}
                    >
                        Edit
                    </Button>

                    {unit.status === "AVAILABLE" && (
                        <Button
                            className="flex-1"
                            onClick={onBook}
                        >
                            Book
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}