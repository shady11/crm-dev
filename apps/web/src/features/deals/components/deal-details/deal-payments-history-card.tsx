import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {DealDetails, VoidedPayment} from "@/features/deals/api/deals.api.ts";
import {IconTooltipButton} from "@/components/shared/icon-tooltip-button.tsx";
import {Ban} from "lucide-react";
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
    /** deals.void_payments: shows Void on each payment (FIN-3). */
    canVoid: boolean;
    onVoid(payment: DealDetails["payments"][number]): void;
    voidedPayments?: VoidedPayment[];
}

export function DealPaymentsHistoryCard({ payments, canRecordPayment, onRecordPayment, canRecordRefund, onRecordRefund, dealId, canIssueReceipts, canVoid, onVoid, voidedPayments = [] }: DealPaymentsHistoryCardProps) {
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
                                    {canVoid && (
                                        <IconTooltipButton variant="ghost" size="icon-sm" onClick={() => onVoid(p)} label={t("paymentsHistory.void", { ns: "deals" })}>
                                            <Ban className="size-3.5" />
                                        </IconTooltipButton>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Voided payments count nowhere, but stay on the record (FIN-3). */}
                {voidedPayments.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("paymentsHistory.voided", { ns: "deals", count: voidedPayments.length })}
                        </p>
                        <div className="flex flex-col divide-y">
                            {voidedPayments.map((p) => (
                                <div key={p.id} className="flex items-start justify-between gap-3 py-2 text-sm text-muted-foreground">
                                    <div className="min-w-0">
                                        <p>
                                            {t(PAYMENT_TYPE_LABEL_KEYS[p.paymentType]) ?? p.paymentType}
                                            {" · "}{t(PAYMENT_METHOD_LABEL_KEYS[p.paymentMethod]) ?? p.paymentMethod}
                                            {p.receiptNumber && ` · ${p.receiptNumber}`}
                                        </p>
                                        <p className="text-xs">
                                            {t("paymentsHistory.voidedBy", {
                                                ns: "deals",
                                                name: p.voidedBy?.fullName ?? "—",
                                                date: new Date(p.voidedAt).toLocaleDateString(i18n.language),
                                            })}
                                        </p>
                                        {p.voidReason && <p className="text-xs italic">{p.voidReason}</p>}
                                    </div>
                                    <p className="shrink-0 line-through tabular-nums">{formatCurrency(p.amount)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}