import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {
    NumberInput,
    NumberInputDecrement,
    NumberInputGroup,
    NumberInputIncrement,
    NumberInputInput
} from "@/components/ui/number-input.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";

const floorSchema = z.object({
    number: z.number().min(1, "Floor number must be positive"),
    order: z.number().int().positive().optional(),
});

type FloorFormValues = z.infer<typeof floorSchema>;

type FloorFormProps = {
    floor?: Floor | null;
    defaultNumber?: number;
    defaultOrder?: number;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: { number: number; order?: number }) => void;
};

export function FloorForm({
                              floor,
                              defaultNumber,
                              defaultOrder,
                              errorMessage,
                              isSubmitting = false,
                              submitLabel,
                              onCancel,
                              onSubmit,
                          }: FloorFormProps) {
    const form = useForm<FloorFormValues>({
        resolver: zodResolver(floorSchema),
        defaultValues: {
            number: defaultNumber,
            order: defaultOrder,
        },
    });

    useEffect(() => {
        form.reset({
            number: floor
                ? Number(floor.number)
                : defaultNumber,
            order: floor
                ? Number(floor.order)
                : defaultOrder,
        });
    }, [form, defaultNumber, defaultOrder]);

    const handleSubmit = (values: FloorFormValues) => {
        onSubmit({
            number: values.number,
            order: values.order || undefined,
        });
    };

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(handleSubmit)}
        >
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    <Controller
                        control={form.control}
                        name="number"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Floor Number</FieldLabel>
                                <NumberInput
                                    value={field.value?.toString() ?? ""}
                                    min={1}
                                    disabled={isSubmitting}
                                    onValueChange={({ valueAsNumber }) =>
                                        field.onChange(
                                            Number.isNaN(valueAsNumber)
                                                ? undefined
                                                : valueAsNumber
                                        )
                                    }
                                >
                                    <NumberInputGroup>
                                        <NumberInputDecrement />
                                        <NumberInputInput/>
                                        <NumberInputIncrement />
                                    </NumberInputGroup>
                                </NumberInput>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    {/*<Controller*/}
                    {/*    control={form.control}*/}
                    {/*    name="order"*/}
                    {/*    render={({ field, fieldState }) => (*/}
                    {/*        <Field invalid={fieldState.invalid}>*/}
                    {/*            <FieldLabel>Order (optional)</FieldLabel>*/}
                    {/*            <NumberInput*/}
                    {/*                value={field.value?.toString() ?? ""}*/}
                    {/*                min={1}*/}
                    {/*                disabled={isSubmitting}*/}
                    {/*                onValueChange={({ valueAsNumber }) =>*/}
                    {/*                    field.onChange(*/}
                    {/*                        Number.isNaN(valueAsNumber)*/}
                    {/*                            ? undefined*/}
                    {/*                            : valueAsNumber*/}
                    {/*                    )*/}
                    {/*                }*/}
                    {/*            >*/}
                    {/*                <NumberInputGroup>*/}
                    {/*                    <NumberInputDecrement />*/}
                    {/*                    <NumberInputInput/>*/}
                    {/*                    <NumberInputIncrement />*/}
                    {/*                </NumberInputGroup>*/}
                    {/*            </NumberInput>*/}
                    {/*            <FieldError>{fieldState.error?.message}</FieldError>*/}
                    {/*        </Field>*/}
                    {/*    )}*/}
                    {/*/>*/}

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
                    {submitLabel ?? (floor ? "Save changes" : "Create floors")}
                </Button>
            </SheetFooter>
        </form>
    );
}