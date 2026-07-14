import { useState } from "react";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    UNIT_TYPE_LABELS,
    UNIT_TYPE_VALUES,
    type UnitType,
} from "@/features/units/types/unit.types.ts";
import * as React from "react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {createListCollection} from "@ark-ui/react";

interface UnitRow {
    number: string;
    type: UnitType;
    rooms: number | undefined;
    area: number;
    price: number;
}

interface BulkUnitsFormProps {
    existingUnits?: { number: string }[];
    lastGlobalUnitNumber?: number;
    errorMessage?: string;
    isSubmitting?: boolean;
    onCancel?: () => void;
    onSubmit: (payload: { units: UnitRow[] }) => void;
}

export function BulkUnitsForm({
                                  existingUnits = [],
                                  lastGlobalUnitNumber = 0,
                                  errorMessage,
                                  isSubmitting = false,
                                  onCancel,
                                  onSubmit,
                              }: BulkUnitsFormProps) {
    const nextStartNumber = lastGlobalUnitNumber + 1;

    const [units, setUnits] = useState<UnitRow[]>([
        {
            number: String(nextStartNumber),
            type: "APARTMENT",
            rooms: undefined,
            area: 0,
            price: 0
        },
    ]);

    const [autoGenOpen, setAutoGenOpen] = useState(false);
    const [genCount, setGenCount] = useState(5);
    const [genStartFrom, setGenStartFrom] = useState(String(nextStartNumber));
    const [genRooms, setGenRooms] = useState("");
    const [genArea, setGenArea] = useState("0");
    const [genPrice, setGenPrice] = useState("0");
    const [genType, setGenType] = useState<UnitType>("APARTMENT");

    const addUnit = () => {
        const allNumbers = [
            ...existingUnits.map(u => parseInt(u.number)),
            ...units.map(u => parseInt(u.number))
        ].filter(n => !isNaN(n));

        const maxNumber = allNumbers.length > 0 ? Math.max(...allNumbers) : lastGlobalUnitNumber;
        const nextNumber = maxNumber + 1;

        setUnits([
            ...units,
            {
                number: String(nextNumber),
                type: units[units.length - 1]?.type || "APARTMENT",
                rooms: units[units.length - 1]?.rooms,
                area: units[units.length - 1]?.area || 0,
                price: units[units.length - 1]?.price || 0
            },
        ]);
    };

    const removeUnit = (index: number) => {
        setUnits(units.filter((_, i) => i !== index));
    };

    const updateUnit = (index: number, field: keyof UnitRow, value: any) => {
        const updated = [...units];
        updated[index] = { ...updated[index], [field]: value };
        setUnits(updated);
    };

    const autoGenerateUnits = () => {
        const startNum = parseInt(genStartFrom);

        if (isNaN(startNum)) return;

        const newUnits: UnitRow[] = [];
        for (let i = 0; i < genCount; i++) {
            newUnits.push({
                number: String(startNum + i),
                type: genType,
                rooms: genRooms ? parseInt(genRooms) : undefined,
                area: parseFloat(genArea || "0"),
                price: parseFloat(genPrice || "0"),
            });
        }
        setUnits(newUnits);
        setAutoGenOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ units });
    };

    const getDuplicateNumbers = () => {
        const existingNumbers = new Set(existingUnits.map(u => u.number));
        const newNumbers = units.map(u => u.number);
        const duplicates: string[] = [];

        newNumbers.forEach(num => {
            if (existingNumbers.has(num)) duplicates.push(num);
        });

        const seen = new Set<string>();
        newNumbers.forEach(num => {
            if (seen.has(num) && !duplicates.includes(num)) duplicates.push(num);
            seen.add(num);
        });

        return duplicates;
    };

    const duplicateNumbers = getDuplicateNumbers();

    const unitsCollection = createListCollection({
        items: [
            UNIT_TYPE_VALUES.map((type) => ({
                label: UNIT_TYPE_LABELS[type],
                value: type,
            })),
        ]
    });

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
        >
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 pb-0">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Units</h3>
                            <div className="flex gap-2">
                                <Popover open={autoGenOpen} onOpenChange={setAutoGenOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isSubmitting}
                                        >
                                            <Wand2 className="size-3 mr-1" />
                                            Auto-generate
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="space-y-4">
                                            <h4 className="font-medium leading-none">Auto-generate Units</h4>
                                            <div className="space-y-2">
                                                <Field>
                                                    <FieldLabel>Number of units</FieldLabel>
                                                    <Input
                                                        type="number"
                                                        value={genCount}
                                                        onChange={(e) => setGenCount(Number(e.target.value))}
                                                        min={1}
                                                        max={100}
                                                    />
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Starting number</FieldLabel>
                                                    <Input
                                                        value={genStartFrom}
                                                        onChange={(e) => setGenStartFrom(e.target.value)}
                                                        placeholder={String(nextStartNumber)}
                                                    />
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Type</FieldLabel>
                                                    <Select
                                                        collection={unitsCollection}
                                                        value={[genType]}
                                                        onValueChange={({ value }) =>
                                                            setGenType((value[0] ?? "APARTMENT") as UnitType)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            {UNIT_TYPE_VALUES.map((type) => (
                                                                <SelectItem key={type} item={type}>
                                                                    {UNIT_TYPE_LABELS[type]}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Rooms (optional)</FieldLabel>
                                                    <Input
                                                        value={genRooms}
                                                        onChange={(e) => setGenRooms(e.target.value)}
                                                    />
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Area (m²)</FieldLabel>
                                                    <Input
                                                        value={genArea}
                                                        onChange={(e) => setGenArea(e.target.value)}
                                                    />
                                                </Field>
                                                <Field>
                                                    <FieldLabel>Price, $</FieldLabel>
                                                    <Input
                                                        value={genPrice}
                                                        onChange={(e) => setGenPrice(e.target.value)}
                                                    />
                                                </Field>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAutoGenOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={autoGenerateUnits}
                                                >
                                                    Generate
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={addUnit}
                                    disabled={isSubmitting}
                                >
                                    <Plus className="size-3" />
                                    Add Unit
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {units.map((unit, index) => (
                                <div key={index} className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">№{unit.number}</span>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="destructive"
                                            onClick={() => removeUnit(index)}
                                            disabled={isSubmitting || units.length === 1}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field data-invalid={duplicateNumbers.includes(unit.number)}>
                                            <FieldLabel>Number</FieldLabel>
                                            <Input
                                                value={unit.number}
                                                onChange={(e) => updateUnit(index, "number", e.target.value)}
                                                disabled={isSubmitting}
                                                aria-invalid={duplicateNumbers.includes(unit.number)}
                                            />
                                            {duplicateNumbers.includes(unit.number) && (
                                                <p className="text-xs text-destructive mt-1">
                                                    This number already exists
                                                </p>
                                            )}
                                        </Field>
                                        <Field>
                                            <FieldLabel>Type</FieldLabel>
                                            <Select
                                                collection={unitsCollection}
                                                value={[unit.type]}
                                                disabled={isSubmitting}
                                                onValueChange={({ value }) =>
                                                    updateUnit(index, "type", value[0] as UnitType)
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {UNIT_TYPE_VALUES.map((type) => (
                                                        <SelectItem key={type} item={type}>
                                                            {UNIT_TYPE_LABELS[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel>Rooms</FieldLabel>
                                            <Input
                                                value={unit.rooms || ""}
                                                onChange={(e) => updateUnit(index, "rooms", e.target.value ? Number(e.target.value) : undefined)}
                                                disabled={isSubmitting}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Area (m²)</FieldLabel>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={unit.area}
                                                onChange={(e) => updateUnit(index, "area", Number(e.target.value))}
                                                disabled={isSubmitting}
                                            />
                                        </Field>
                                        <Field className="col-span-2">
                                            <FieldLabel>Price, $</FieldLabel>
                                            <Input
                                                value={unit.price}
                                                onChange={(e) => updateUnit(index, "price", Number(e.target.value))}
                                                disabled={isSubmitting}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {duplicateNumbers.length > 0 && (
                        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            Duplicate unit numbers detected. Please fix them before creating.
                        </p>
                    )}

                    {errorMessage && (
                        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {errorMessage}
                        </p>
                    )}
                </FieldGroup>
            </SheetBody>

            <SheetFooter>
                <SheetClose asChild>
                    {onCancel && (
                        <Button
                            variant="secondary"
                            className="flex-1"
                            disabled={isSubmitting}
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Create {units.length} Unit{units.length !== 1 ? "s" : ""}
                </Button>
            </SheetFooter>
        </form>
    );
}