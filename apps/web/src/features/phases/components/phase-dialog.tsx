import {useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Dialog, DialogContent, DialogFooter, DialogHeader} from "@/components/ui/dialog.tsx";
import {Field, FieldError, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import type {PhasePayload} from "@/features/phases/api/phases.api.ts";
import {type Phase, PHASE_STATUS_LABEL_KEYS, PhaseSalesStatus} from "@/features/phases/types/phase.types.ts";

interface PhaseDialogProps {
    open: boolean;
    phase: Phase | null;
    isSubmitting: boolean;
    onCancel(): void;
    onSubmit(payload: PhasePayload): void;
}

/** Add or edit a phase: name, sales status and expected completion. */
export function PhaseDialog({open, phase, isSubmitting, onCancel, onSubmit}: PhaseDialogProps) {
    const {t} = useTranslation("phases");
    // Remounted per phase by the caller's key, so initial state is enough.
    const [name, setName] = useState(phase?.name ?? "");
    const [salesStatus, setSalesStatus] = useState<PhaseSalesStatus>(phase?.salesStatus ?? PhaseSalesStatus.ON_SALE);
    const [completionDate, setCompletionDate] = useState(phase?.completionDate?.slice(0, 10) ?? "");
    const [touched, setTouched] = useState(false);

    const statusCollection = createListCollection({
        items: Object.values(PhaseSalesStatus).map((value) => ({label: t(PHASE_STATUS_LABEL_KEYS[value]), value})),
    });

    const submit = () => {
        setTouched(true);
        if (!name.trim()) return;
        onSubmit({name: name.trim(), salesStatus, completionDate: completionDate || null});
    };

    return (
        <Dialog open={open} onOpenChange={({open: isOpen}) => !isOpen && onCancel()}>
            <DialogContent size="sm">
                <DialogHeader title={phase ? t("form.editTitle") : t("form.createTitle")} />
                <form
                    className="flex flex-col gap-4 px-(--space) pb-(--space)"
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit();
                    }}
                >
                    <Field invalid={touched && !name.trim()}>
                        <FieldLabel>{t("form.name")}</FieldLabel>
                        <Input autoFocus value={name} placeholder={t("form.namePlaceholder")} onChange={(e) => setName(e.target.value)} />
                        <FieldError>{t("form.nameRequired")}</FieldError>
                    </Field>
                    <Field>
                        <FieldLabel>{t("form.salesStatus")}</FieldLabel>
                        <Select
                            collection={statusCollection}
                            value={[salesStatus]}
                            onValueChange={({value}) => setSalesStatus((value[0] as PhaseSalesStatus) ?? PhaseSalesStatus.ON_SALE)}
                        >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {statusCollection.items.map((item) => (
                                    <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel>{t("form.completionDate")}</FieldLabel>
                        <DateField value={completionDate} onChange={setCompletionDate} clearable />
                    </Field>
                    <button type="submit" hidden />
                </form>
                <DialogFooter>
                    <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>
                        {t("form.cancel")}
                    </Button>
                    <Button type="button" disabled={isSubmitting} onClick={submit}>
                        {phase ? t("form.save") : t("form.create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
