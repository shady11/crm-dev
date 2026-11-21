import {useEffect, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader} from "@/components/ui/dialog";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Button} from "@/components/ui/button.tsx";
import {getDiscountApprovers} from "@/features/deals/api/deals.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useDebouncedValue} from "@/hooks/use-debounced-value.ts";

interface RequestDiscountDialogProps {
    open: boolean;
    onOpenChange(open: boolean): void;
    listPrice: number;
    clientId: string;
    /** The discount the deal has now, to start from. */
    currentPercent: number;
    isPending: boolean;
    onSubmit(values: {discountPercent: number; note?: string}): void;
}

/**
 * E2E-21: a new discount on a reservation, after a rejection or when the
 * client and the manager settle on another figure, without cancelling and
 * booking again. Says before sending whether it applies at once or waits
 * for someone's approval, and the price it gives.
 */
export function RequestDiscountDialog({open, onOpenChange, listPrice, clientId, currentPercent, isPending, onSubmit}: RequestDiscountDialogProps) {
    const {t, i18n} = useTranslation("deals");
    const {formatCurrency} = useCompanyFormatters();
    const [percentText, setPercentText] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        if (open) {
            setPercentText(currentPercent > 0 ? String(currentPercent) : "");
            setNote("");
        }
    }, [open, currentPercent]);

    const percent = Number(percentText.replace(",", "."));
    const valid = percentText.trim() !== "" && Number.isFinite(percent) && percent >= 0 && percent <= 100;
    const debounced = useDebouncedValue(valid ? percent : null);

    const approvers = useQuery({
        queryKey: ["deals", "discount-approvers", debounced, clientId],
        queryFn: () => getDiscountApprovers(debounced!, clientId),
        enabled: open && debounced != null && debounced > 0,
    });

    const newPrice = valid ? Math.round(listPrice * (1 - percent / 100) * 100) / 100 : null;
    const names = approvers.data?.approvers.map((a) => a.fullName) ?? [];
    const approverList = names.length > 0 ? new Intl.ListFormat(i18n.language, {type: "disjunction"}).format(names) : null;
    const outcome = !valid || percent === 0
        ? (valid ? t("requestDiscount.removes") : null)
        : approvers.data?.requiresApproval
            ? (approverList ? t("requestDiscount.needsApproval", {approvers: approverList}) : t("requestDiscount.needsApprovalUnknown"))
            : approvers.data
                ? t("requestDiscount.appliesNow")
                : null;

    return (
        <Dialog open={open} onOpenChange={({open}) => onOpenChange(open)}>
            <DialogContent size="sm">
                <DialogHeader title={t("requestDiscount.title")} description={t("requestDiscount.description")} />
                <DialogBody>
                    <FieldSet className="pt-4">
                        <FieldGroup>
                            <Field invalid={percentText !== "" && !valid}>
                                <FieldLabel>{t("requestDiscount.percent")}</FieldLabel>
                                <Input
                                    inputMode="decimal"
                                    value={percentText}
                                    onChange={(e) => setPercentText(e.target.value)}
                                    placeholder="0"
                                />
                                {newPrice != null && (
                                    <FieldDescription>
                                        {t("requestDiscount.newPrice", {price: formatCurrency(newPrice), list: formatCurrency(listPrice)})}
                                    </FieldDescription>
                                )}
                                {outcome && <FieldDescription>{outcome}</FieldDescription>}
                            </Field>
                            <Field>
                                <FieldLabel>{t("requestDiscount.note")}</FieldLabel>
                                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("requestDiscount.notePlaceholder")} />
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>{t("detailsPage.back")}</Button>
                    <Button
                        disabled={!valid || isPending}
                        isLoading={isPending}
                        onClick={() => onSubmit({discountPercent: percent, note: note.trim() || undefined})}
                    >
                        {approvers.data?.requiresApproval && percent > 0 ? t("requestDiscount.submitForApproval") : t("requestDiscount.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
