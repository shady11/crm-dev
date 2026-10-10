import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import { z } from "zod";
import {useTranslation} from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {createListCollection} from "@ark-ui/react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {BLOCK_SALES_STATUS_LABEL_KEYS, BlockSalesStatus} from "@/features/blocks/types/block-sales.ts";
import {
    NumberInput,
    NumberInputDecrement,
    NumberInputGroup,
    NumberInputIncrement,
    NumberInputInput
} from "@/components/ui/number-input.tsx";

type BlockFormValues = {
    name: string;
    order?: number;
    salesStatus: BlockSalesStatus;
    completionDate: string;
};

export type BlockPayload = {
    name: string;
    order?: number;
    salesStatus: BlockSalesStatus;
    completionDate: string | null;
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
    const { t } = useTranslation("blocks");

    const blockSchema = useMemo(() => z.object({
        name: z.string().trim().min(1, t("validation.nameRequired")),
        order: z.number().int().positive().optional(),
        salesStatus: z.enum(BlockSalesStatus),
        completionDate: z.string(),
    }), [t]);

    const form = useForm<BlockFormValues>({
        resolver: zodResolver(blockSchema),defaultValues: {
            name: "",
            order: defaultOrder,
            salesStatus: BlockSalesStatus.ON_SALE,
            completionDate: "",
        },
    });

    useEffect(() => {
        form.reset({
            name: block?.name ?? "",
            order: block
                ? Number(block.order)
                : defaultOrder,
            salesStatus: block?.salesStatus ?? BlockSalesStatus.ON_SALE,
            completionDate: block?.completionDate?.slice(0, 10) ?? "",
        });
    }, [form, block?.name, block?.order, block?.salesStatus, block?.completionDate]);

    const statusCollection = createListCollection({
        items: Object.values(BlockSalesStatus).map((value) => ({label: t(BLOCK_SALES_STATUS_LABEL_KEYS[value]), value})),
    });

    const handleSubmit = (values: BlockFormValues) => {
        onSubmit({
            name: values.name.trim(),
            order: values.order || undefined,
            salesStatus: values.salesStatus,
            completionDate: values.completionDate || null,
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
                                <FieldLabel>{t("form.nameLabel")}</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder={t("form.namePlaceholder")}
                                    aria-label={t("form.namePlaceholder")}
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
                                <FieldLabel>{t("form.orderLabel")}</FieldLabel>
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
                        name="salesStatus"
                        render={({ field }) => (
                            <Field>
                                <FieldLabel>{t("form.salesStatusLabel")}</FieldLabel>
                                <Select
                                    collection={statusCollection}
                                    value={[field.value]}
                                    onValueChange={({ value }) => field.onChange(value[0] ?? BlockSalesStatus.ON_SALE)}
                                >
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {statusCollection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="completionDate"
                        render={({ field }) => (
                            <Field>
                                <FieldLabel>{t("form.completionLabel")}</FieldLabel>
                                <DateField value={field.value} onChange={field.onChange} clearable />
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
                        >{t("common:actions.cancel")}</Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin"/>}
                    {submitLabel ?? (block ? t("common:actions.saveChanges") : t("form.submitCreate"))}
                </Button>
            </SheetFooter>
        </form>
    );
}