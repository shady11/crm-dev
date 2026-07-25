import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
// import {
//     NumberInput,
//     NumberInputDecrement,
//     NumberInputGroup,
//     NumberInputIncrement,
//     NumberInputInput
// } from "@/components/ui/number-input.tsx";

const entranceSchema = z.object({
    name: z.string().trim().min(1, "Entrance name is required"),
    order: z.number().int().positive().optional(),
});

type EntranceFormValues = z.infer<typeof entranceSchema>;

type EntranceFormProps = {
    entrance?: Entrance | null;
    defaultOrder?: number;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: { name: string; order?: number }) => void;
};

export function EntranceForm({
                                 entrance,
                                 defaultOrder,
                                 errorMessage,
                                 isSubmitting = false,
                                 submitLabel,
                                 onCancel,
                                 onSubmit,
                             }: EntranceFormProps) {
    const form = useForm<EntranceFormValues>({
        resolver: zodResolver(entranceSchema),
        defaultValues: {
            name: "",
            order: defaultOrder,
        },
    });

    useEffect(() => {
        form.reset({
            name: entrance?.name ?? "",
            order: entrance
                ? Number(entrance.order)
                : defaultOrder,
        });
    }, [form, entrance?.name, defaultOrder]);

    const handleSubmit = (values: EntranceFormValues) => {
        onSubmit({
            name: values.name.trim(),
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
                        name="name"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Name</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder="Entrance name (e.g., 1, 2, Main)"
                                    aria-label="Entrance name"
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    {/*<Controller*/}
                    {/*    control={form.control}*/}
                    {/*    name="order"*/}
                    {/*    render={({ field, fieldState }) => (*/}
                    {/*        <Field invalid={fieldState.invalid}>*/}
                    {/*            <FieldLabel>Display order (optional)</FieldLabel>*/}
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
                </FieldGroup>

                {errorMessage && (
                    <Alert variant="destructive" className="mt-4">
                        <TriangleAlert />
                        <AlertTitle>{errorMessage}</AlertTitle>
                    </Alert>
                )}
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
                    {isSubmitting && <Loader2 className="animate-spin"/>}
                    {submitLabel ?? (entrance ? "Save changes" : "Create entrance")}
                </Button>
            </SheetFooter>
        </form>
    );
}