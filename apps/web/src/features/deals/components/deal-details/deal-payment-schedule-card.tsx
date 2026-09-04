import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {Table, TableBody, TableCell, TableRow} from "@/components/ui/table.tsx";
import {Progress} from "@/components/ui/progress";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

const SCHEDULE_STATUS_CLASSES: Record<string, string> = {
    PENDING: "bg-gray-400",
    PARTIAL: "bg-amber-400",
    PAID: "bg-emerald-400",
    OVERDUE: "bg-rose-500",
};

const SCHEDULE_STATUS_LABEL_KEYS: Record<string, string> = {
    PENDING: "payments:schedule.status.pending",
    PARTIAL: "payments:schedule.status.partial",
    PAID: "payments:schedule.status.paid",
    OVERDUE: "payments:schedule.status.overdue",
};

interface DealPaymentScheduleCardProps {
    status: string;
    schedules: DealDetails["paymentSchedules"];
    onGenerateSchedule(): void;
}

export function DealPaymentScheduleCard({ status, schedules, onGenerateSchedule }: DealPaymentScheduleCardProps) {
    const { t } = useTranslation("payments");
    const { formatCurrency } = useCompanyFormatters();

    const canGenerate = status === "ACTIVE";

    const paidCount = schedules.filter((s) => s.status === "PAID").length;
    const totalAmount = schedules.reduce((sum, s) => sum + s.amount, 0);
    const paidAmount = schedules.reduce((sum, s) => sum + s.paidAmount, 0);
    const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    const currentIndex = schedules.findIndex((s) => s.status !== "PAID");

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4">
                <div>
                    <CardTitle>Payment schedule</CardTitle>
                    {schedules.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {paidCount}/{schedules.length} paid · {formatCurrency(paidAmount)}/{formatCurrency(totalAmount)}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 w-24">
                    {schedules.length > 0 && (
                        <Progress className="h-1" value={progressPercent} />
                        // <CircularProgress value={progressPercent} size={36} thickness={4}>
                        //     <CircularProgressValue className="absolute" />
                        // </CircularProgress>
                    )}
                    {schedules.length === 0 && canGenerate && (
                        <Button variant="secondary" size="xs" onClick={onGenerateSchedule}>
                            Generate schedule
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {schedules.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {canGenerate ? "No payment schedule yet." : "Available once the deal is activated."}
                    </p>
                ) : (
                    <div className="h-80 py-2">
                        <ScrollArea scrollFade className="pr-2">
                            <Table className="mx-auto w-full max-w-xl">
                                <TableBody>
                                    {schedules.map((s, i) => (
                                        <TableRow
                                            key={s.id}
                                            className={`text-sm ${
                                                i === currentIndex ? " bg-border" : ""
                                            }`}
                                        >
                                            <TableCell>
                                                #{s.order}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(s.dueDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(s.paidAmount)} / {formatCurrency(s.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={`${SCHEDULE_STATUS_CLASSES[s.status]} text-white`}>
                                                    {t(SCHEDULE_STATUS_LABEL_KEYS[s.status])}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}