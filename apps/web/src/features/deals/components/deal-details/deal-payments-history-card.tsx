import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {ReceiptButton} from "@/features/payments/components/receipt-button.tsx";

export const PAYMENT_TYPE_LABEL_KEYS: Record<string, string> = {
    DEPOSIT: "payments:type.deposit",
    INSTALLMENT: "payments:type.installment",
    FINAL: "payments:type.final_payment",
    REFUND: "payments:type.refund",
};

export const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
    CASH: "payments:method.cash",
    BANK_TRANSFER: "payments:method.bank_transfer",
    MBANK: "payments:method.mbank",
    OPTIMA: "payments:method.optima",
    ELKART: "payments:method.elkart",
    OTHER: "payments:method.other",
};

interface DealPaymentsHistoryCardProps {
    payments: DealDetails["payments"];
    canRecordPayment: boolean;
    onRecordPayment(): void;
    /** A refund outside the ACTIVE stage, where Record payment isn't offered. */
    canRecordRefund?: boolean;
    onRecordRefund?(): void;
    /** Shows each payment's Receipt button (deals.manage_payments). */
    dealId: string;
    canIssueReceipts: boolean;
}

export function DealPaymentsHistoryCard({ payments, canRecordPayment, onRecordPayment, canRecordRefund, onRecordRefund, dealId, canIssueReceipts }: DealPaymentsHistoryCardProps) {
    const { t, i18n } = useTranslation(["payments", "deals"]);
    const { formatCurrency } = useCompanyFormatters();
    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4">
                <CardTitle>{t("paymentsHistory.title", { ns: "deals" })}</CardTitle>
                {canRecordPayment && (
                    <Button size="xs" onClick={onRecordPayment}>
                        {t("paymentsHistory.record", { ns: "deals" })}
                    </Button>
                )}
                {canRecordRefund && (
                    <Button size="xs" variant="secondary" onClick={onRecordRefund}>
                        {t("paymentsHistory.recordRefund", { ns: "deals" })}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("paymentsHistory.empty", { ns: "deals" })}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <div>
                                    <p className="font-medium">{t(PAYMENT_TYPE_LABEL_KEYS[p.paymentType]) ?? p.paymentType}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(PAYMENT_METHOD_LABEL_KEYS[p.paymentMethod]) ?? p.paymentMethod}
                                        {p.reference && ` · ${p.reference}`}
                                        {p.receiptNumber && ` · ${p.receiptNumber}`}
                                    </p>
                                    {p.user && (
                                        <p className="text-xs text-muted-foreground">
                                            {t("paymentsHistory.recordedBy", { ns: "deals", name: p.user.fullName })}
                                        </p>
                                    )}
                                    {p.note && <p className="mt-0.5 text-xs italic text-muted-foreground">{p.note}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrency(p.amount)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(p.paidAt).toLocaleDateString(i18n.language)}
                                        </p>
                                    </div>
                                    {canIssueReceipts && p.receiptNumber && (
                                        <ReceiptButton dealId={dealId} paymentId={p.id} receiptNumber={p.receiptNumber} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}