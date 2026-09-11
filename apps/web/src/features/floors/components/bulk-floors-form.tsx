import { useState } from "react";
import {Loader2, Plus, Trash2, TriangleAlert} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import * as React from "react";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {useTranslation} from "react-i18next";
import {
    NumberInput,
    NumberInputDecrement,
    NumberInputGroup,
    NumberInputIncrement,
    NumberInputInput
} from "@/components/ui/number-input.tsx";

interface BulkFloorsFormProps {
    existingFloors?: Floor[];
    errorMessage?: string;
    isSubmitting?: boolean;
    onCancel?: () => void;
    onSubmit: (payload: { floors: { number: number; order?: number }[] }) => void;
}

export function BulkFloorsForm({
                                   existingFloors = [],
                                   errorMessage,
                                   isSubmitting = false,
                                   onCancel,
                                   onSubmit,
                               }: BulkFloorsFormProps) {
    const { t } = useTranslation("floors");

    const getNextFloorNumber = () => {
        if (existingFloors.length === 0) return 1;
        const maxExistingNumber = Math.max(...existingFloors.map(f => f.number));
        return maxExistingNumber + 1;
    };

    const getNextOrder = () => {
        if (existingFloors.length === 0) return 1;
        const maxExistingOrder = Math.max(...existingFloors.map(f => f.order || 0));
        return maxExistingOrder + 1;
    };

    const nextNumber = getNextFloorNumber();
    const nextOrder = getNextOrder();

    const [floors, setFloors] = useState([
        { number: nextNumber, order: nextOrder },
    ]);

    const addFloor = () => {
        const maxNumber = Math.max(
            ...existingFloors.map(f => f.number),
            ...floors.map(f => f.number),
            0
        );
        const maxOrder = Math.max(
            ...existingFloors.map(f => f.order || 0),
            ...floors.map(f => f.order || 0),
            0
        );
        setFloors([...floors, { number: maxNumber + 1, order: maxOrder + 1 }]);
    };

    const removeFloor = (index: number) => {
        setFloors(floors.filter((_, i) => i !== index));
    };

    const updateFloor = (index: number, field: "number" | "order", value: number) => {
        const updated = [...floors];
        updated[index] = { ...updated[index], [field]: value };
        setFloors(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ floors });
    };

    const getDuplicateNumbers = () => {
        const existingNumbers = new Set(existingFloors.map(f => f.number));
        const newNumbers = floors.map(f => f.number);
        const duplicates: number[] = [];

        newNumbers.forEach(num => {
            if (existingNumbers.has(num)) duplicates.push(num);
        });

        const seen = new Set<number>();
        newNumbers.forEach(num => {
            if (seen.has(num) && !duplicates.includes(num)) duplicates.push(num);
            seen.add(num);
        });

        return duplicates;
    };

    const duplicateNumbers = getDuplicateNumbers();

    function formatFloorRanges(floors: number[]): string {
        if (floors.length === 0) return "";

        const sorted = [...floors].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
            }
        }

        ranges.push(start === end ? `${start}` : `${start}-${end}`);

        return ranges.join(", ");
    }

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
        >
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium">{t("bulk.floorsHeading")}</h3>
                            {existingFloors.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("bulk.existingFloors", { ranges: formatFloorRanges(existingFloors.map(f => f.number)) })}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addFloor}
                            disabled={isSubmitting}
                        >
                            <Plus className="size-3 mr-1" /> {t("bulk.addFloor")}</Button>
                    </div>

                    <div className="space-y-2">
                        {floors.map((floor, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                                <Field invalid={duplicateNumbers.includes(floor.number)}>
                                    <FieldLabel>{t("bulk.floorNumberLabel")}</FieldLabel>
                                    <div className="flex items-center gap-2">
                                        <NumberInput
                                            size="sm"
                                            value={floor.number?.toString() ?? ""}
                                            min={1}
                                            disabled={isSubmitting}
                                            onValueChange={({ valueAsNumber }) =>
                                                updateFloor(index, "number", valueAsNumber)
                                            }
                                        >
                                            <NumberInputGroup>
                                                <NumberInputDecrement />
                                                <NumberInputInput/>
                                                <NumberInputIncrement />
                                            </NumberInputGroup>
                                        </NumberInput>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="destructive"
                                            onClick={() => removeFloor(index)}
                                            disabled={isSubmitting || floors.length === 1}
                                            aria-label={t("common:actions.delete")}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                    <FieldError>
                                        {duplicateNumbers.includes(floor.number)
                                            ? t("bulk.duplicateNumberError")
                                            : undefined}
                                    </FieldError>
                                </Field>
                            </div>
                        ))}
                    </div>

                    {duplicateNumbers.length > 0 && (
                        <Alert variant="destructive" className="mt-4 items-center">
                            <TriangleAlert />
                            <AlertTitle>{t("bulk.duplicateNumbersAlert")}</AlertTitle>
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
                        >{t("common:actions.cancel")}</Button>
                    )}
                </SheetClose>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {t("bulk.submitCreate", { count: floors.length })}
                </Button>
            </SheetFooter>
        </form>
    );
}