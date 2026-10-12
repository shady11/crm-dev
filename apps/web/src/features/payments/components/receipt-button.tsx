import {Loader2, ReceiptText} from "lucide-react";
import {useTranslation} from "react-i18next";
import {IconTooltipButton} from "@/components/shared/icon-tooltip-button.tsx";
import {useReceiptDownload} from "@/features/payments/hooks/use-receipt-download.ts";

/** Downloads a payment's receipt PDF, issuing it the first time. */
export function ReceiptButton({dealId, paymentId, receiptNumber}: {dealId: string; paymentId: string; receiptNumber: string}) {
    const {t} = useTranslation("payments");
    const receipt = useReceiptDownload();

    return (
        <IconTooltipButton
            variant="ghost"
            size="icon-sm"
            disabled={receipt.isPending}
            onClick={() => receipt.mutate({dealId, paymentId})}
            label={t("receipt.download", {number: receiptNumber})}
        >
            {receipt.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ReceiptText className="size-3.5" />}
        </IconTooltipButton>
    );
}
