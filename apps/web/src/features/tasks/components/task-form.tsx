import {useEffect, useMemo} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {CalendarIcon, Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {createListCollection} from "@ark-ui/react";
import {parseDate} from "@internationalized/date";

import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {DatePicker, DatePickerContent, DatePickerTrigger} from "@/components/ui/date-picker.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {useAssignableUsers} from "@/features/users/hooks/use-assignable-users.ts";
import {TASK_STATUS_LABEL_KEYS, TaskStatus} from "@/features/tasks/types/task.types.ts";
import type {Task, TaskPayload} from "@/features/tasks/api/tasks.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {
    CalendarMonthSelect,
    CalendarNextTrigger,
    CalendarPrevTrigger,
    CalendarTable,
    CalendarTableDays,
    CalendarViewControl,
    CalendarWeekDays,
    CalendarYearSelect
} from "@/components/ui/calendar.tsx";
import {useTranslation} from "react-i18next";

type TaskFormValues = {
    title: string;
    description?: string;
    dueDate?: string;
    status: TaskStatus;
    assignedToId: string;
};

interface TaskFormProps {
    task?: Task | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?(): void;
    onSubmit(payload: TaskPayload): void;
}

const DEFAULT_VALUES: TaskFormValues = {
    title: "", description: "", dueDate: "", status: TaskStatus.TODO, assignedToId: "",
};

function toFormValues(task?: Task | null): TaskFormValues {
    if (!task) return DEFAULT_VALUES;
    return {
        title: task.title,
        description: task.description ?? "",
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        status: task.status,
        assignedToId: task.assignedTo.id,
    };
}

export function TaskForm({ task, errorMessage, isSubmitting, submitLabel, onCancel, onSubmit }: TaskFormProps) {
    const { t, i18n } = useTranslation("tasks");

    const assignableUsers = useAssignableUsers();

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const taskSchema = useMemo(() => z.object({
        title: z.string().trim().min(2, t("form.validation.titleMin")),
        description: z.string().trim().optional(),
        dueDate: z.string().trim().optional(),
        status: z.enum(TaskStatus),
        assignedToId: z.string().min(1, t("form.validation.selectAssignee")),
    }), [t]);

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: toFormValues(task),
    });

    useEffect(() => { form.reset(toFormValues(task)); }, [task]);

    const statusCollection = createListCollection({
        items: Object.values(TaskStatus).map(
            (s) => ({
                label: t(TASK_STATUS_LABEL_KEYS[s]),
                value: s
            })
        ),
    });
    const assigneeCollection = createListCollection({
        items: assignableUsers.data.map((u) => ({ label: u.fullName, value: u.id })),
    });

    const handleSubmit = form.handleSubmit((values) => {
        onSubmit({
            title: values.title,
            description: values.description || undefined,
            dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
            status: values.status,
            assignedToId: values.assignedToId,
        });
    });

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    {errorMessage && (
                        <Alert variant="destructive">
                            <TriangleAlert className="size-4" />
                            <AlertTitle>{errorMessage}</AlertTitle>
                        </Alert>
                    )}

                    <Controller control={form.control} name="title" render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("form.title")}</FieldLabel>
                            <Input {...field} placeholder={t("form.titlePlaceholder")} />
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )} />

                    <Controller control={form.control} name="description" render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("form.description")}</FieldLabel>
                            <Textarea {...field} rows={3} />
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )} />

                    <Controller control={form.control} name="assignedToId" render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("form.assignee")}</FieldLabel>
                            <Select collection={assigneeCollection} value={field.value ? [field.value] : []} onValueChange={(item) => field.onChange(item.value[0])}>
                                <SelectTrigger className="w-full"><SelectValue placeholder={t("form.selectAssignee")} /></SelectTrigger>
                                <SelectContent>
                                    {assigneeCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )} />

                    <Controller control={form.control} name="status" render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("form.status")}</FieldLabel>
                            <Select collection={statusCollection} value={[field.value]} onValueChange={(item) => field.onChange(item.value[0])}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {statusCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )} />

                    <Controller
                        control={form.control}
                        name="dueDate"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.dueDate")}</FieldLabel>
                                <DatePicker
                                    value={field.value ? [parseDate(field.value)] : []}
                                    onValueChange={({ value }) => field.onChange(value[0] ? value[0].toString() : "")}
                                >
                                    <DatePickerTrigger asChild>
                                        <Button type="button" className="w-full flex justify-between" variant="outline">
                                            {field.value ? formatDate(field.value, i18n.language).date : t("form.selectDueDate")}
                                            <CalendarIcon />
                                        </Button>
                                    </DatePickerTrigger>
                                    <DatePickerContent>
                                        <CalendarViewControl>
                                            <CalendarPrevTrigger />
                                            <CalendarMonthSelect />
                                            <CalendarYearSelect />
                                            <CalendarNextTrigger />
                                        </CalendarViewControl>
                                        <CalendarTable>
                                            <CalendarWeekDays />
                                            <CalendarTableDays />
                                        </CalendarTable>
                                    </DatePickerContent>
                                </DatePicker>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                </FieldGroup>
            </SheetBody>

            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>{t("form.cancel")}</Button>
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (task ? t("form.saveChanges") : t("form.save"))}
                </Button>
            </SheetFooter>
        </form>
    );
}