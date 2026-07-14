import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {
    NumberInput,
    NumberInputDecrement,
    NumberInputGroup,
    NumberInputIncrement,
    NumberInputInput
} from "@/components/ui/number-input.tsx";

const blockSchema = z.object({
    name: z.string().trim().min(1, "Block name is required"),
    order: z.number().int().positive().optional(),
});

type BlockFormValues = z.infer<typeof blockSchema>;

export type BlockPayload = {
    name: string;
    order?: number;
};

type BlockFormProps = {
    block?: Block | null;
    defaultOrder?: number;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: BlockPayload) => void;
};

export function BlockForm({
                              block,
                              defaultOrder,
                              errorMessage,
                              isSubmitting = false,
                              submitLabel,
                              onCancel,
                              onSubmit,
                          }: BlockFormProps) {
    const form = useForm<BlockFormValues>({
        resolver: zodResolver(blockSchema),defaultValues: {
            name: "",
            order: defaultOrder,
        },
    });

    useEffect(() => {
        form.reset({
            name: block?.name ?? "",
            order: block
                ? Number(block.order)
                : defaultOrder,
        });
    }, [form, block?.name, block?.order]);

    const handleSubmit = (values: BlockFormValues) => {
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
                <FieldGroup className="gap-5 py-2">
                    <Controller
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Name</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder="Block name (e.g., A, B, C)"
                                    aria-label="Block name"
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="order"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Order (Optional)</FieldLabel>
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
                    {submitLabel ?? (block ? "Save changes" : "Create block")}
                </Button>
            </SheetFooter>
        </form>
    );
}