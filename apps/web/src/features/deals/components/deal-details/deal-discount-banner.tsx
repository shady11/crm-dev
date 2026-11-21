import {useState} from "react";
import {BadgePercentIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {DialogBody} from "@/components/ui/dialog.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import type {Deal, DiscountDecision} from "@/features/deals/api/deals.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface DealDiscountBannerProps {
    deal: Pick<
        Deal,
        "status" | "listPrice" | "discountApprovalStatus" | "requestedDiscountPercent" | "requestedDiscountAmount" | "discountRejectionReason"
    >;
    /** deals.approve_discount: the viewer approves discounts at all. */
    canApprove: boolean;
    /** From GET /deals/:id; absent until it loads, when canApprove alone decides. */
    decision?: DiscountDecision | null;
    isDeciding: boolean;
    /** E2E-21: a smaller percent than asked, or undefined for what was asked. */
    onApprove(discountPercent?: number): void;
    onReject(): void;
    /** deals.manage on a reservation: may ask for a new discount after a rejection. */
    onRequestAgain?(): void;
}

/**
 * A discount above the manager's own limit waits for a decision, and the
 * contract can't be signed meanwhile, so this sits at the top of the deal
 * where both the manager and the approver will see it.
 */
export function DealDiscountBanner({deal, canApprove, decision, isDeciding, onApprove, onReject, onRequestAgain}: DealDiscountBannerProps) {
    const {t, i18n} = useTranslation("deals");
    const {formatCurrency} = useCompanyFormatters();
    // E2E-11: approving changes the price, so it's confirmed like rejecting.
    const [confirmOpen, setConfirmOpen] = useState(false);
    // E2E-21: what the approver grants, up to what was asked.
    const [approvedText, setApprovedText] = useState("");
    const requestedPercent = deal.requestedDiscountPercent ?? 0;
    const approvedPercent = Number(approvedText.replace(",", "."));
    const approvedValid = approvedText.trim() !== "" && Number.isFinite(approvedPercent)
        && approvedPercent > 0 && approvedPercent <= requestedPercent;
    const approvedPrice = approvedValid ? Math.round(deal.listPrice * (1 - approvedPercent / 100) * 100) / 100 : null;

    const requested = {
        percent: deal.requestedDiscountPercent ?? 0,
        amount: formatCurrency(deal.requestedDiscountAmount ?? 0),
    };

    if (deal.discountApprovalStatus === "PENDING") {
        // SH-1: only someone whose own limit covers the request gets the
        // buttons; an approver with a lower limit is told who has it.
        const canDecide = canApprove && (decision?.canDecide ?? true);
        const names = decision?.approvers.map((a) => a.fullName) ?? [];
        const approvers = names.length > 0
            ? new Intl.ListFormat(i18n.language, {type: "disjunction"}).format(names)
            : null;
        const description = canDecide
            ? t("discountBanner.pendingApprover")
            : canApprove
                ? (approvers ? t("discountBanner.aboveYourLimit", {approvers}) : t("discountBanner.aboveYourLimitUnknown"))
                : (approvers ? t("discountBanner.pendingRequesterWith", {approvers}) : t("discountBanner.pendingRequester"));

        return (
            <Alert variant="warning">
                <BadgePercentIcon />
                <AlertTitle>{t("discountBanner.pendingTitle", requested)}</AlertTitle>
                <AlertDescription>
                    {description}
                </AlertDescription>
                {canDecide && (
                    <AlertAction>
                        <Button size="sm" variant="secondary" disabled={isDeciding} onClick={onReject}>
                            {t("discountBanner.reject")}
                        </Button>
                        <Button size="sm" disabled={isDeciding} isLoading={isDeciding} onClick={() => { setApprovedText(String(requestedPercent)); setConfirmOpen(true); }}>
                            {t("discountBanner.approve")}
                        </Button>
                    </AlertAction>
                )}
                <AlertDialog open={confirmOpen} onOpenChange={({open}) => setConfirmOpen(open)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("discountBanner.approveDialogTitle", requested)}</AlertDialogTitle>
                            <AlertDialogDescription>{t("discountBanner.approveDialogDescription")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <DialogBody className="pb-4">
                        <Field invalid={approvedText !== "" && !approvedValid}>
                            <FieldLabel>{t("discountBanner.approvePercent")}</FieldLabel>
                            <Input inputMode="decimal" value={approvedText} onChange={(e) => setApprovedText(e.target.value)} />
                            <FieldDescription>
                                {approvedValid
                                    ? t("discountBanner.approvePrice", {price: formatCurrency(approvedPrice!), list: formatCurrency(deal.listPrice)})
                                    : t("discountBanner.approvePercentHint", {percent: requestedPercent})}
                            </FieldDescription>
                        </Field>
                        </DialogBody>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeciding}>{t("common:actions.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isDeciding || !approvedValid}
                                onClick={() => {
                                    setConfirmOpen(false);
                                    onApprove(approvedPercent < requestedPercent ? approvedPercent : undefined);
                                }}
                            >
                                {approvedValid && approvedPercent < requestedPercent
                                    ? t("discountBanner.approveAt", {percent: approvedPercent})
                                    : t("discountBanner.approve")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Alert>
        );
    }

    // Only while it still matters: once signed, the price is settled.
    if (deal.discountApprovalStatus === "REJECTED" && deal.status === "RESERVED") {
        return (
            <Alert variant="info">
                <BadgePercentIcon />
                <AlertTitle>{t("discountBanner.rejectedTitle", requested)}</AlertTitle>
                {deal.discountRejectionReason && (
                    <AlertDescription>{t("discountBanner.reason", {reason: deal.discountRejectionReason})}</AlertDescription>
                )}
                {onRequestAgain && (
                    <AlertAction>
                        <Button size="sm" variant="secondary" onClick={onRequestAgain}>
                            {t("discountBanner.requestAgain")}
                        </Button>
                    </AlertAction>
                )}
            </Alert>
        );
    }

    return null;
}
