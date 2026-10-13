import {BadgePercentIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {Deal, DiscountDecision} from "@/features/deals/api/deals.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface DealDiscountBannerProps {
    deal: Pick<
        Deal,
        "status" | "discountApprovalStatus" | "requestedDiscountPercent" | "requestedDiscountAmount" | "discountRejectionReason"
    >;
    /** deals.approve_discount: the viewer approves discounts at all. */
    canApprove: boolean;
    /** From GET /deals/:id; absent until it loads, when canApprove alone decides. */
    decision?: DiscountDecision | null;
    isDeciding: boolean;
    onApprove(): void;
    onReject(): void;
}

/**
 * A discount above the manager's own limit waits for a decision, and the
 * contract can't be signed meanwhile, so this sits at the top of the deal
 * where both the manager and the approver will see it.
 */
export function DealDiscountBanner({deal, canApprove, decision, isDeciding, onApprove, onReject}: DealDiscountBannerProps) {
    const {t, i18n} = useTranslation("deals");
    const {formatCurrency} = useCompanyFormatters();

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
                        <Button size="sm" disabled={isDeciding} isLoading={isDeciding} onClick={onApprove}>
                            {t("discountBanner.approve")}
                        </Button>
                    </AlertAction>
                )}
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
            </Alert>
        );
    }

    return null;
}
