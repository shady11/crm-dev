import {useEffect, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    normalizeUnitStatus,
    normalizeUnitType,
    type Unit,
    UNIT_STATUS_LABEL_KEYS,
    UNIT_STATUS_VALUES,
    UNIT_TYPE_LABEL_KEYS,
    UNIT_TYPE_VALUES,
    UnitStatus,
    UnitType,
} from "@/features/units/types/unit.types.ts";
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
import type {CreateUnitPayload} from "@/features/units/types/unit-payload.ts";
import {useTranslation} from "react-i18next";

const unitSchema = z.object({
    number: z.string().trim().min(1),
    type: z.enum(UNIT_TYPE_VALUES),
    status: z.enum(UNIT_STATUS_VALUES),
    rooms: z.number().optional(),
    area: z.number().positive(),
    price: z.number().nonnegative(),
});

type UnitFormInput = z.input<typeof unitSchema>;
type UnitFormValues = z.infer<typeof unitSchema>;

type UnitFormProps = {
    unit?: Unit | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: Partial<CreateUnitPayload>) => void;
};

const DEFAULT_VALUES: UnitFormValues = {
    number: "",
    type: UnitType.APARTMENT,
    status: UnitStatus.AVAILABLE,
    rooms: 1,
    area: 0,
    price: 0,
};

export function UnitForm({
                             unit,
                             errorMessage,
                             isSubmitting = false,
                             submitLabel,
                             onCancel,
                             onSubmit,
                         }: UnitFormProps) {
    const { t } = useTranslation("units");

    const initialType = normalizeUnitType(unit?.type);
    const [, setSelectedType] =
        useState<UnitType>(initialType);

    const initialStatus = normalizeUnitStatus(unit?.status);
    const [, setSelectedStatus] =
        useState<UnitStatus>(initialStatus);

    const form = useForm<UnitFormInput>({
        resolver: zodResolver(unitSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        form.reset({
            number: unit?.number ?? "",
            type: initialType,
            status: initialStatus,
            rooms: unit?.rooms ?? 1,
            area: Number(unit?.area ?? 0),
            price: Number(unit?.price ?? 0),
        });
    }, [form, unit]);

    const handleSubmit = (values: UnitFormValues) => {
        onSubmit({
            number: values.number.trim(),
            type: values.type,
            status: values.status,
            rooms: values.rooms,
            area: values.area,
            price: values.price,
        });
    };

    const typeCollection = createListCollection({
        items: [
            ...UNIT_TYPE_VALUES.map((type) => ({
                label: t(UNIT_TYPE_LABEL_KEYS[type]),
                value: type,
            })),
        ]
    });

    const statusCollection = createListCollection({
        items: [
            ...UNIT_STATUS_VALUES.map((status) => ({
                label: t(UNIT_STATUS_LABEL_KEYS[status]),
                value: status,
            })),
        ]
    });

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
                                <FieldLabel>Unit Number</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder="e.g., 1, 101, A-1"
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="type"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid} orientation="responsive">
                                <FieldLabel>Type</FieldLabel>
                                <Select
                                    collection={typeCollection}
                                    name={field.name}
                                    onValueChange={(item) => {
                                        const type = item.value[0] as UnitType;
                                        setSelectedType(type);
                                        form.setValue("type", type, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    value={[field.value]}
                                >
                                    <SelectTrigger className="w-full min-w-32">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {typeCollection.items.map((type) => (
                                            <SelectItem key={type.value} item={type}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="rooms"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Rooms (Optional)</FieldLabel>
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

                    <Controller
                        control={form.control}
                        name="area"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Area (m²)</FieldLabel>
                                <Input
                                    {...field}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="price"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Price</FieldLabel>
                                <Input
                                    {...field}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid} orientation="responsive">
                                <FieldLabel>Status</FieldLabel>
                                <Select
                                    collection={statusCollection}
                                    name={field.name}
                                    onValueChange={(item) => {
                                        const status = item.value[0] as UnitStatus;
                                        setSelectedStatus(status);
                                        form.setValue("status", status, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    value={[field.value]}
                                >
                                    <SelectTrigger className="w-full min-w-32">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusCollection.items.map((status) => (
                                            <SelectItem key={status.value} item={status}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

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
                    {submitLabel ?? (unit ? "Save changes" : "Create unit")}
                </Button>
            </SheetFooter>
        </form>
    );
}