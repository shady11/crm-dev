import { useState } from "react";
import {Loader2, Plus, Trash2, TriangleAlert, Wand2} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    normalizeUnitType,
    UNIT_TYPE_LABELS,
    UNIT_TYPE_VALUES,
    type UnitType,
} from "@/features/units/types/unit.types.ts";
import * as React from "react";
import {
    Popover,
    PopoverBody, PopoverClose,
    PopoverContent,
    PopoverFooter,
    PopoverHeader,
    PopoverTrigger
} from "@/components/ui/popover.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {createListCollection} from "@ark-ui/react";
import {
    NumberInput,
    NumberInputDecrement,
    NumberInputGroup,
    NumberInputIncrement,
    NumberInputInput
} from "@/components/ui/number-input.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";

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

    const [open, setAutoGenOpen] = useState(false);
    const [genCount, setGenCount] = useState(5);
    const [genStartFrom, setGenStartFrom] = useState(String(nextStartNumber));
    const [genRooms, setGenRooms] = useState(1);
    const [genArea, setGenArea] = useState(0);
    const [genPrice, setGenPrice] = useState(0);
    const [genType, setGenType] = useState("APARTMENT");

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
                type: normalizeUnitType(genType),
                rooms: genRooms ?? undefined,
                area: genArea || 0,
                price: genPrice || 0,
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

    const typeCollection = createListCollection({
        items: UNIT_TYPE_VALUES.map((type) => ({
            label: UNIT_TYPE_LABELS[type],
            value: type,
        })),
    });

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
        >
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Units</h3>
                            <div className="flex gap-2">
                                <Popover onOpenChange={({ open: isOpen }) => setAutoGenOpen(isOpen)} open={open}>
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
                                    <PopoverContent className="w-64">
                                        <PopoverHeader title="Auto-generate Units"/>
                                        <PopoverBody>
                                            <FieldGroup className="gap-2">
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Number of units</FieldLabel>
                                                    <Input
                                                        size="sm"
                                                        className="col-span-2"
                                                        value={genCount}
                                                        onChange={(e) => setGenCount(Number(e.target.value))}
                                                        min={1}
                                                    />
                                                </Field>
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Starting number</FieldLabel>
                                                    <Input
                                                        size="sm"
                                                        className="col-span-2"
                                                        value={genStartFrom}
                                                        onChange={(e) => setGenStartFrom(e.target.value)}
                                                        placeholder={String(nextStartNumber)}
                                                    />
                                                </Field>
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Type</FieldLabel>
                                                    <Select
                                                        className="col-span-2"
                                                        collection={typeCollection}
                                                        value={[genType]}
                                                        onValueChange={(item) => {
                                                            setGenType(item.value[0])
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full" size="sm">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-51">
                                                            {typeCollection.items.map((item) => (
                                                                <SelectItem key={item.value} item={item}>
                                                                    {item.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </Field>
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Rooms</FieldLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        className="col-span-2"
                                                        value={genRooms.toString()}
                                                        min={1}
                                                        disabled={isSubmitting}
                                                        onValueChange={({ valueAsNumber }) =>
                                                            setGenRooms(valueAsNumber)
                                                        }
                                                    >
                                                        <NumberInputGroup>
                                                            <NumberInputDecrement />
                                                            <NumberInputInput/>
                                                            <NumberInputIncrement />
                                                        </NumberInputGroup>
                                                    </NumberInput>
                                                </Field>
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Area (m²)</FieldLabel>
                                                    <Input
                                                        size="sm"
                                                        className="col-span-2"
                                                        value={genArea}
                                                        onChange={(e) => setGenArea(Number(e.target.value))}
                                                    />
                                                </Field>
                                                <Field className="grid grid-cols-3 items-center gap-4">
                                                    <FieldLabel>Price</FieldLabel>
                                                    <Input
                                                        size="sm"
                                                        className="col-span-2"
                                                        value={genPrice}
                                                        onChange={(e) => setGenPrice(Number(e.target.value))}
                                                    />
                                                </Field>
                                            </FieldGroup>
                                        </PopoverBody>
                                        <PopoverFooter>
                                            <PopoverClose asChild>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setAutoGenOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            </PopoverClose>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={autoGenerateUnits}
                                            >
                                                Generate
                                            </Button>
                                        </PopoverFooter>
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
                                        <Field invalid={duplicateNumbers.includes(unit.number)}>
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
                                                collection={typeCollection}
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
                                                    {typeCollection.items.map((type) => (
                                                        <SelectItem key={type.value} item={type}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field className="col-span-2">
                                            <FieldLabel>Rooms</FieldLabel>
                                            <NumberInput
                                                size="sm"
                                                value={unit.rooms?.toString() ?? genRooms.toString()}
                                                min={1}
                                                disabled={isSubmitting}
                                                onValueChange={({ valueAsNumber }) =>
                                                    updateUnit(index, "rooms", valueAsNumber)
                                                }
                                            >
                                                <NumberInputGroup>
                                                    <NumberInputDecrement />
                                                    <NumberInputInput/>
                                                    <NumberInputIncrement />
                                                </NumberInputGroup>
                                            </NumberInput>
                                        </Field>
                                        <Field>
                                            <FieldLabel>Area (m²)</FieldLabel>
                                            <Input
                                                value={unit.area}
                                                onChange={(e) => updateUnit(index, "area", Number(e.target.value))}
                                                disabled={isSubmitting}
                                            />
                                        </Field>
                                        <Field>
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
                        <Alert variant="destructive" className="mt-4 items-center">
                            <TriangleAlert />
                            <AlertTitle>Duplicate floor numbers detected. Please fix them before creating.</AlertTitle>
                        </Alert>
                    )}

                    {errorMessage && (
                        <Alert variant="destructive" className="mt-4">
                            <TriangleAlert />
                            <AlertTitle>{errorMessage}</AlertTitle>
                        </Alert>
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