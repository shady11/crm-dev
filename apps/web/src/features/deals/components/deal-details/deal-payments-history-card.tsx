import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

const PAYMENT_TYPE_LABEL_KEYS: Record<string, string> = {
    DEPOSIT: "payments:type.deposit",
    INSTALLMENT: "payments:type:installment",
    FINAL: "payments:type.final_payment",
    REFUND: "payments:type.refund",
};

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
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
}

export function DealPaymentsHistoryCard({ payments, canRecordPayment, onRecordPayment }: DealPaymentsHistoryCardProps) {
    const { t } = useTranslation("payments");
    const { formatCurrency } = useCompanyFormatters();
    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4">
                <CardTitle>Payments</CardTitle>
                {canRecordPayment && (
                    <Button size="xs" onClick={onRecordPayment}>
                        Record payment
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <div>
                                    <p className="font-medium">{t(PAYMENT_TYPE_LABEL_KEYS[p.paymentType]) ?? p.paymentType}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(PAYMENT_METHOD_LABEL_KEYS[p.paymentMethod]) ?? p.paymentMethod}
                                        {p.reference && ` · ${p.reference}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(p.paidAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}