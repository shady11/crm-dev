import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
    DEPOSIT: "Deposit",
    INSTALLMENT: "Installment",
    FINAL: "Final payment",
    REFUND: "Refund",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    MBANK: "MBank",
    OPTIMA: "Optima",
    ELKART: "Elkart",
    OTHER: "Other",
};

interface DealPaymentsHistoryCardProps {
    payments: DealDetails["payments"];
    canRecordPayment: boolean;
    onRecordPayment(): void;
}

export function DealPaymentsHistoryCard({ payments, canRecordPayment, onRecordPayment }: DealPaymentsHistoryCardProps) {
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
                                    <p className="font-medium">{PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                                        {p.reference && ` · ${p.reference}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{p.amount.toLocaleString("en-US")} $</p>
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