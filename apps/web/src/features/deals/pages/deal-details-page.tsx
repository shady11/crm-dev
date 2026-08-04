import {useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {ArrowLeft, CalendarIcon, Dot, MoreVerticalIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {useDeal} from "@/features/deals/hooks/use-deal";
import {useDealActions} from "@/features/deals/hooks/use-deal-actions";
import {DEAL_STATUS_VISUALS} from "@/features/deals/types/deal.types";
import {DealUnitCard} from "@/features/deals/components/deal-unit-card.tsx";
import {DealClientCard} from "@/features/deals/components/deal-details/deal-client-card.tsx";
import {DealManagerCard} from "@/features/deals/components/deal-details/deal-manager-card.tsx";
import {DealFinancialsCard} from "@/features/deals/components/deal-details/deal-financials-card.tsx";
import {Menu, MenuContent, MenuItem, MenuTrigger} from "@/components/ui/menu.tsx";
import {daysUntil} from "@/features/deals/utils/days-until.ts";
import {DealHistoryCard} from "@/features/deals/components/deal-details/deal-history-card.tsx";
import {formatDate} from "@/utils/date-formatter.ts";
import {DatePicker, DatePickerContent, DatePickerTrigger} from "@/components/ui/date-picker.tsx";
import {
    CalendarMonthSelect,
    CalendarNextTrigger,
    CalendarPrevTrigger,
    CalendarTable,
    CalendarTableDays,
    CalendarViewControl,
    CalendarWeekDays,
    CalendarYearSelect
} from "@/components/ui/calendar.tsx";
import {createListCollection, parseDate} from "@ark-ui/react";
import {format} from "date-fns";
import {Field, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field.tsx";
import {DealPaymentScheduleCard} from "@/features/deals/components/deal-details/deal-payment-schedule-card.tsx";
import {DealPaymentsHistoryCard} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";
import {NumberInput, NumberInputGroup, NumberInputInput} from "@/components/ui/number-input";
import type {PaymentMethod, PaymentType} from "../api/deals.api";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DealTimelineCard} from "@/features/deals/components/deal-details/deal-timeline-card.tsx";

export function DealDetailsPage() {
    const { dealId } = useParams<{ dealId: string }>();
    const navigate = useNavigate();
    const dealQuery = useDeal(dealId);
    const actions = useDealActions(dealId!);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    const [extendOpen, setExtendOpen] = useState(false);
    const [newExpiry, setNewExpiry] = useState([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);

    const [signOpen, setSignOpen] = useState(false);
    const [contractNumber, setContractNumber] = useState("");
    const [contractDate, setContractDate] = useState([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);

    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [installments, setInstallments] = useState(1);
    const [firstPaymentDate, setFirstPaymentDate] = useState([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
    const [intervalMonths, setIntervalMonths] = useState(1);

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
    const [paymentType, setPaymentType] = useState<PaymentType | "">("");
    const [paidAt, setPaidAt] = useState([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
    const [reference, setReference] = useState("");

    const deal = dealQuery.data;
    if (!deal) return null;

    const visual = DEAL_STATUS_VISUALS[deal.status];

    const daysLeft = deal.status === "RESERVED" ? daysUntil(deal.reservationExpiresAt) : null;

    const paymentMethodCollection = createListCollection({
        items: [
            { label: "Cash", value: "CASH" },
            { label: "Bank transfer", value: "BANK_TRANSFER" },
            { label: "MBank", value: "MBANK" },
            { label: "Optima", value: "OPTIMA" },
            { label: "Elkart", value: "ELKART" },
            { label: "Other", value: "OTHER" },
        ],
    });

    const paymentTypeCollection = createListCollection({
        items: [
            { label: "Deposit", value: "DEPOSIT" },
            { label: "Installment", value: "INSTALLMENT" },
            { label: "Final payment", value: "FINAL" },
            { label: "Refund", value: "REFUND" },
        ],
    });

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-muted-foreground"
                    onClick={() => navigate("/deals")}
                >
                    <ArrowLeft className="size-3.5" />
                    Back to deals
                </Button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-semibold">Deal #{deal.dealNumber}</h1>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                            <Badge className={`${visual?.bg} text-white`}>{visual?.heading}</Badge>
                            {daysLeft !== null && (
                                <div className="flex items-center">
                                    <Dot />
                                    <span className={`text-sm font-medium ${daysLeft <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                                        {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Expires today" : "Expired"}
                                    </span>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                {deal.contractNumber && `Контракт №${deal.contractNumber}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {deal.status === "RESERVED" && (
                            <>
                                <Button variant="secondary" onClick={() => setExtendOpen(true)}>
                                    Extend reservation
                                </Button>
                                <Button onClick={() => setSignOpen(true)}>Sign contract</Button>
                            </>
                        )}
                        {deal.status === "CONTRACT_SIGNED" && (
                            <Button onClick={() => actions.activate.mutate()} disabled={actions.activate.isPending}>
                                Activate deal
                            </Button>
                        )}
                        {["RESERVED", "CONTRACT_SIGNED", "ACTIVE"].includes(deal.status) && (
                            <Menu>
                                <MenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" aria-label="More actions">
                                        <MoreVerticalIcon className="size-4" />
                                    </Button>
                                </MenuTrigger>
                                <MenuContent>
                                    {deal.status === "ACTIVE" && (
                                        <MenuItem value="complete" onSelect={() => actions.complete.mutate()}>
                                            Mark as completed
                                        </MenuItem>
                                    )}
                                    <MenuItem value="cancel" variant="destructive" onSelect={() => setCancelOpen(true)}>
                                        Cancel deal
                                    </MenuItem>
                                </MenuContent>
                            </Menu>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-2 space-y-4">

                    <DealUnitCard unit={deal.unit} project={deal.project} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <DealClientCard client={deal.client} />
                        <DealManagerCard manager={deal.manager} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <DealPaymentScheduleCard
                            status={deal.status}
                            schedules={deal.paymentSchedules}
                            onGenerateSchedule={() => setScheduleOpen(true)}
                        />
                        <DealPaymentsHistoryCard
                            payments={deal.payments}
                            canRecordPayment={deal.status === "ACTIVE"}
                            onRecordPayment={() => setPaymentOpen(true)}
                        />
                    </div>
                </div>
                <div className="flex-1 space-y-4">
                    <DealFinancialsCard deal={deal} />
                    <DealTimelineCard deal={deal} />
                    <DealHistoryCard activities={deal.activities} />
                </div>
            </div>

            {/* Cancel dialog */}
            <Dialog open={cancelOpen} onOpenChange={({ open }) => setCancelOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title="Cancel deal"/>
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>Reason (optional)</FieldLabel>
                                    <Textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                            Back
                        </Button>
                        <Button
                            variant="default"
                            disabled={actions.cancel.isPending}
                            onClick={() =>
                                actions.cancel.mutate(cancelReason || undefined, {
                                    onSuccess: () => setCancelOpen(false),
                                })
                            }
                        >
                            Confirm cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend dialog */}
            <Dialog open={extendOpen} onOpenChange={({ open }) => setExtendOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader
                        description={deal.reservationExpiresAt && `Currently expires ${formatDate(deal.reservationExpiresAt).date}.`}
                        title="Extend reservation"
                    />
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>New date</FieldLabel>
                                    <DatePicker onValueChange={({ value }) => setNewExpiry(value)} value={newExpiry}>
                                        <DatePickerTrigger asChild>
                                            <Button className="w-full flex justify-between" variant="outline">
                                                {formatDate(newExpiry[0].toString()).date}
                                                <CalendarIcon />
                                            </Button>
                                        </DatePickerTrigger>
                                        <DatePickerContent>
                                            <CalendarViewControl>
                                                <CalendarPrevTrigger />
                                                <CalendarMonthSelect />
                                                <CalendarYearSelect />
                                                <CalendarNextTrigger />
                                            </CalendarViewControl>
                                            <CalendarTable>
                                                <CalendarWeekDays />
                                                <CalendarTableDays />
                                            </CalendarTable>
                                        </DatePickerContent>
                                    </DatePicker>
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setExtendOpen(false)}>
                            Back
                        </Button>
                        <Button
                            disabled={!newExpiry || actions.extend.isPending}
                            onClick={() =>
                                actions.extend.mutate(new Date(newExpiry[0].toString()).toISOString(), {
                                    onSuccess: () => setExtendOpen(false),
                                })
                            }
                        >
                            Extend
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sign contract dialog */}
            <Dialog open={signOpen} onOpenChange={({ open }) => setSignOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title="Sign contract"/>
                    <DialogBody className="flex flex-col gap-3">
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>Contract number</FieldLabel>
                                    <Input
                                        placeholder="Contract number"
                                        value={contractNumber}
                                        onChange={(e) => setContractNumber(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Contract Date</FieldLabel>
                                    <DatePicker onValueChange={({ value }) => setContractDate(value)} value={contractDate}>
                                        <DatePickerTrigger asChild>
                                            <Button className="w-full flex justify-between" variant="outline">
                                                {formatDate(contractDate[0].toString()).date}
                                                <CalendarIcon />
                                            </Button>
                                        </DatePickerTrigger>
                                        <DatePickerContent>
                                            <CalendarViewControl>
                                                <CalendarPrevTrigger />
                                                <CalendarMonthSelect />
                                                <CalendarYearSelect />
                                                <CalendarNextTrigger />
                                            </CalendarViewControl>
                                            <CalendarTable>
                                                <CalendarWeekDays />
                                                <CalendarTableDays />
                                            </CalendarTable>
                                        </DatePickerContent>
                                    </DatePicker>
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSignOpen(false)}>
                            Back
                        </Button>
                        <Button
                            disabled={!contractNumber || !contractDate || actions.sign.isPending}
                            onClick={() =>

                                actions.sign.mutate(
                                    { contractNumber, contractDate: new Date(contractDate[0].toString()).toISOString() },
                                    { onSuccess: () => setSignOpen(false) },
                                )
                            }
                        >
                            Sign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate payment schedule dialog */}
            <Dialog open={scheduleOpen} onOpenChange={({ open }) => setScheduleOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate payment schedule</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="flex flex-col gap-3">
                        <Field>
                            <FieldLabel>Number of installments</FieldLabel>
                            <NumberInput
                                value={String(installments)}
                                min={1}
                                onValueChange={({ valueAsNumber }) => setInstallments(Number.isNaN(valueAsNumber) ? 1 : valueAsNumber)}
                            >
                                <NumberInputGroup><NumberInputInput /></NumberInputGroup>
                            </NumberInput>
                        </Field>
                        <Field>
                            <FieldLabel>First payment date</FieldLabel>
                            <DatePicker onValueChange={({ value }) => setFirstPaymentDate(value)} value={firstPaymentDate ?? []}>
                                <DatePickerTrigger asChild>
                                    <Button className="w-full flex justify-between" variant="outline">
                                        {formatDate(firstPaymentDate[0].toString()).date}
                                        <CalendarIcon />
                                    </Button>
                                </DatePickerTrigger>
                                <DatePickerContent>
                                    <CalendarViewControl>
                                        <CalendarPrevTrigger />
                                        <CalendarMonthSelect />
                                        <CalendarYearSelect />
                                        <CalendarNextTrigger />
                                    </CalendarViewControl>
                                    <CalendarTable>
                                        <CalendarWeekDays />
                                        <CalendarTableDays />
                                    </CalendarTable>
                                </DatePickerContent>
                            </DatePicker>
                        </Field>
                        <Field>
                            <FieldLabel>Interval between payments (months)</FieldLabel>
                            <NumberInput
                                value={String(intervalMonths)}
                                min={1}
                                onValueChange={({ valueAsNumber }) => setIntervalMonths(Number.isNaN(valueAsNumber) ? 1 : valueAsNumber)}
                            >
                                <NumberInputGroup><NumberInputInput /></NumberInputGroup>
                            </NumberInput>
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setScheduleOpen(false)}>Back</Button>
                        <Button
                            disabled={!installments || !firstPaymentDate || actions.generateSchedule.isPending}
                            onClick={() =>
                                actions.generateSchedule.mutate(
                                    { installments, firstPaymentDate: new Date(firstPaymentDate[0].toString()).toISOString(), intervalMonths },
                                    { onSuccess: () => setScheduleOpen(false) },
                                )
                            }
                        >
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record payment dialog */}
            <Dialog open={paymentOpen} onOpenChange={({ open }) => setPaymentOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record payment</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="flex flex-col gap-3">
                        <Field>
                            <FieldLabel>Amount</FieldLabel>
                            <NumberInput
                                value={String(paymentAmount)}
                                min={0}
                                onValueChange={({ valueAsNumber }) => setPaymentAmount(Number.isNaN(valueAsNumber) ? 0 : valueAsNumber)}
                            >
                                <NumberInputGroup><NumberInputInput /></NumberInputGroup>
                            </NumberInput>
                        </Field>
                        <Field>
                            <FieldLabel>Payment method</FieldLabel>
                            <Select
                                collection={paymentMethodCollection}
                                value={paymentMethod ? [paymentMethod] : []}
                                onValueChange={({ value }) => setPaymentMethod((value[0] as PaymentMethod) ?? "")}
                            >
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select method" /></SelectTrigger>
                                <SelectContent>
                                    {paymentMethodCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Payment type</FieldLabel>
                            <Select
                                collection={paymentTypeCollection}
                                value={paymentType ? [paymentType] : []}
                                onValueChange={({ value }) => setPaymentType((value[0] as PaymentType) ?? "")}
                            >
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {paymentTypeCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Payment date</FieldLabel>
                            <DatePicker onValueChange={({ value }) => setPaidAt(value)} value={paidAt ?? []}>
                                <DatePickerTrigger asChild>
                                    <Button className="w-full flex justify-between" variant="outline">
                                        {formatDate(paidAt[0].toString()).date}
                                        <CalendarIcon />
                                    </Button>
                                </DatePickerTrigger>
                                <DatePickerContent>
                                    <CalendarViewControl>
                                        <CalendarPrevTrigger />
                                        <CalendarMonthSelect />
                                        <CalendarYearSelect />
                                        <CalendarNextTrigger />
                                    </CalendarViewControl>
                                    <CalendarTable>
                                        <CalendarWeekDays />
                                        <CalendarTableDays />
                                    </CalendarTable>
                                </DatePickerContent>
                            </DatePicker>
                        </Field>
                        <Field>
                            <FieldLabel>Reference (optional)</FieldLabel>
                            <Input placeholder="e.g. transaction ID" value={reference} onChange={(e) => setReference(e.target.value)} />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Back</Button>
                        <Button
                            disabled={!paymentAmount || !paymentMethod || !paymentType || !paidAt || actions.recordPayment.isPending}
                            onClick={() =>
                                actions.recordPayment.mutate(
                                    {
                                        amount: paymentAmount,
                                        paymentMethod: paymentMethod as PaymentMethod,
                                        paymentType: paymentType as PaymentType,
                                        paidAt: new Date(paidAt[0].toString()).toISOString(),
                                        reference: reference || undefined,
                                    },
                                    { onSuccess: () => setPaymentOpen(false) },
                                )
                            }
                        >
                            Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}