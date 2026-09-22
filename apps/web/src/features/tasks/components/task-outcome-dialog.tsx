import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Dialog, DialogContent, DialogFooter, DialogHeader} from "@/components/ui/dialog.tsx";
import {Field, FieldLabel} from "@/components/ui/field.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {TASK_STATUS_LABEL_KEYS, type TaskStatus} from "@/features/tasks/types/task.types.ts";

interface TaskOutcomeDialogProps {
    open: boolean;
    status: TaskStatus | null;
    isSubmitting?: boolean;
    onCancel(): void;
    onConfirm(outcome: string): void;
}

// Prompted whenever a task is about to close as DONE/CANCELLED without
// already carrying an outcome — mirrors TasksService.ensureOutcomeOnClose on
// the API, which rejects that transition outright.
export function TaskOutcomeDialog({ open, status, isSubmitting, onCancel, onConfirm }: TaskOutcomeDialogProps) {
    const { t } = useTranslation("tasks");
    const [outcome, setOutcome] = useState("");

    useEffect(() => { if (open) setOutcome(""); }, [open]);

    return (
        <Dialog open={open} onOpenChange={({ open: isOpen }) => !isOpen && onCancel()}>
            <DialogContent size="sm">
                <DialogHeader
                    title={t("outcomeDialog.title")}
                    description={status ? t("outcomeDialog.description", { status: t(TASK_STATUS_LABEL_KEYS[status]) }) : undefined}
                />
                <div className="px-(--space) pb-(--space)">
                    <Field>
                        <FieldLabel>{t("outcomeDialog.label")}</FieldLabel>
                        <Textarea
                            autoFocus
                            rows={3}
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value)}
                            placeholder={t("outcomeDialog.placeholder")}
                        />
                    </Field>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>
                        {t("form.cancel")}
                    </Button>
                    <Button
                        type="button"
                        disabled={isSubmitting || !outcome.trim()}
                        onClick={() => onConfirm(outcome.trim())}
                    >
                        {t("outcomeDialog.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
