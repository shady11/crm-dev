import {WalletIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {DealStatus} from "@/features/deals/types/deal.types";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface DealMoneyHeldBannerProps {
    status: DealStatus;
    /** Net of refunds already recorded. */
    totalPaid: number;
    /** deals.manage_payments: shows Record refund. */
    canRefund: boolean;
    onRecordRefund(): void;
}

/**
 * A reservation that ended cancelled or expired can still hold the client's
 * deposit. Nothing else on a closed deal asks for attention, so this says
 * how much is held until a refund brings it to zero.
 */
export function DealMoneyHeldBanner({status, totalPaid, canRefund, onRecordRefund}: DealMoneyHeldBannerProps) {
    const {t} = useTranslation("deals");
    const {formatCurrency} = useCompanyFormatters();

    if (!["CANCELLED", "EXPIRED"].includes(status) || totalPaid <= 0) return null;

    return (
        <Alert variant="warning">
            <WalletIcon />
            <AlertTitle>{t("moneyHeldBanner.title", {amount: formatCurrency(totalPaid)})}</AlertTitle>
            <AlertDescription>{t("moneyHeldBanner.description")}</AlertDescription>
            {canRefund && (
                <AlertAction>
                    <Button size="sm" onClick={onRecordRefund}>{t("paymentsHistory.recordRefund")}</Button>
                </AlertAction>
            )}
        </Alert>
    );
}
