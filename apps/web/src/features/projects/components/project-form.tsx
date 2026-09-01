import {useEffect, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";

import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel,} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select.tsx";
import type {ProjectPayload} from "@/features/projects/api/projects.api";
import {
    normalizeProjectStatus,
    type Project,
    PROJECT_STATUS_LABEL_KEYS,
    PROJECT_STATUS_VALUES,
    ProjectStatus,
} from "@/features/projects/types/project.types";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {createListCollection} from "@ark-ui/react";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {useTranslation} from "react-i18next";

const projectSchema = z.object({
    name: z.string().trim().min(2, "Project name must be at least 2 characters"),
    address: z.string().trim().optional(),
    status: z.enum(PROJECT_STATUS_VALUES, "Select a status"),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type ProjectFormProps = {
    project?: Project | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: ProjectPayload) => void;
};

const DEFAULT_VALUES: ProjectFormValues = {
    name: "",
    address: "",
    status: ProjectStatus.DRAFT,
};

export function ProjectForm({
                                project,
                                errorMessage,
                                isSubmitting = false,
                                submitLabel,
                                onCancel,
                                onSubmit,
                            }: ProjectFormProps) {
    const { t } = useTranslation("projects");

    const initialStatus = normalizeProjectStatus(project?.status);
    const [, setSelectedStatus] =
        useState<ProjectStatus>(initialStatus);

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            ...DEFAULT_VALUES,
            status: initialStatus,
        },
    });

    useEffect(() => {
        form.reset({
            name: project?.name ?? "",
            address: project?.address ?? "",
            status: initialStatus,
        });
    }, [form, initialStatus, project?.address, project?.name]);
    const handleSubmit = (values: ProjectFormValues) => {
        onSubmit({
            name: values.name.trim(),
            address: values.address?.trim() ?? "",
            status: values.status,
        });
    };

    const statusCollection = createListCollection({
        items: [
            ...PROJECT_STATUS_VALUES.map((status) => ({
                label: t(PROJECT_STATUS_LABEL_KEYS[status]),
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
                        name="name"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Name</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder="Project name"
                                    aria-label="Project name"
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="address"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Address</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder="Address"
                                    aria-label="Address"
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
                                        const status = item.value[0] as ProjectStatus;
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
                    {submitLabel ?? (project ? "Save changes" : "Create project")}
                </Button>
            </SheetFooter>
        </form>
    );
}
