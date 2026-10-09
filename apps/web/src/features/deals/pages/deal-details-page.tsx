import {useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {ArrowLeft, CalendarIcon, FileTextIcon, MoreVerticalIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {useDeal} from "@/features/deals/hooks/use-deal";
import {useDealActions} from "@/features/deals/hooks/use-deal-actions";
import {DEAL_STATUS_VISUALS, type DealStatus} from "@/features/deals/types/deal.types";
import {Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger} from "@/components/ui/menu.tsx";
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
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field.tsx";
import {DealPaymentScheduleCard} from "@/features/deals/components/deal-details/deal-payment-schedule-card.tsx";
import {DealPaymentsHistoryCard} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";
import {NumberInput, NumberInputGroup, NumberInputInput} from "@/components/ui/number-input";
import type {PaymentMethod, PaymentType} from "../api/deals.api";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DealTasksCard} from "@/features/deals/components/deal-tasks-card.tsx";
import {DealDiscountBanner} from "@/features/deals/components/deal-details/deal-discount-banner.tsx";
import {EntityDocumentsCard} from "@/features/documents/components/entity-documents-card.tsx";
import {useEntityDocuments} from "@/features/documents/hooks/use-entity-documents.ts";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {DealStageTracker} from "@/features/deals/components/deal-details/deal-stage-tracker.tsx";
import {DealKeyFigures} from "@/features/deals/components/deal-details/deal-key-figures.tsx";
import {DealDetailsSidebar} from "@/features/deals/components/deal-details/deal-details-sidebar.tsx";
import {useTranslation} from "react-i18next";
import {PAYMENT_METHOD_LABEL_KEYS, PAYMENT_TYPE_LABEL_KEYS} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {useReservationPolicy} from "@/features/deals/hooks/use-reservation-policy.ts";
import {reservationDateBounds} from "@/features/deals/utils/reservation-dates.ts";
import {hasPermission} from "@/features/auth/access";
import {ReassignManagerDialog} from "@/features/users/components/reassign-manager-dialog.tsx";
import {PageError, PageSkeleton} from "@/components/shared/page-query-state.tsx";

const TAB_VALUES = ["payments", "documents", "activity"] as const;
type DealTab = (typeof TAB_VALUES)[number];

/** Open on what this stage is about: paperwork before payments start, then payments. */
function defaultTabFor(status: DealStatus): DealTab {
    if (status === "ACTIVE" || status === "COMPLETED") return "payments";
    if (status === "RESERVED" || status === "CONTRACT_SIGNED") return "documents";
    return "activity";
}

function TabCount({ count }: { count: number }) {
    if (count === 0) return null;
    return <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{count}</span>;
}

export function DealDetailsPage() {
    const { t, i18n } = useTranslation(["deals", "payments"]);
    const { dealId } = useParams<{ dealId: string }>();
    const navigate = useNavigate();
    const dealQuery = useDeal(dealId);
    const actions = useDealActions(dealId!);
    const { user } = useAuth();
    // SH-A1: reassignment is a team-lead action, gated the same way the
    // backend endpoint is (deals.reassign) rather than by a specific role name.
    const canReassign = hasPermission(user, "deals.reassign");
    const canGenerateDocuments = hasPermission(user, "documents.generate");
    const canDecideDiscount = hasPermission(user, "deals.approve_discount");
    const canCancel = hasPermission(user, "deals.cancel");
    const [rejectOpen, setRejectOpen] = useState(false);
    const [activateOpen, setActivateOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    const [extendOpen, setExtendOpen] = useState(false);
    const [newExpiry, setNewExpiry] = useState([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
    const reservationPolicy = useReservationPolicy(hasPermission(user, "deals.manage")).data;

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

    const [reassignOpen, setReassignOpen] = useState(false);

    // The open tab lives in the URL, so a link can point at a deal's payments or documents.
    const [searchParams, setSearchParams] = useSearchParams();
    const documentsCount = useEntityDocuments("DEAL", dealId!).documents.length;

    const deal = dealQuery.data;
    if (dealQuery.isLoading) return <PageSkeleton />;
    if (dealQuery.isError || !deal) return <PageError onRetry={() => dealQuery.refetch()} />;

    // Payments are stored signed — refunds are negative amounts — so the plain
    // sum is always the correct net figure, with no refund special-casing here
    // or anywhere else. See PaymentService on the API side.
    const totalPaid = deal.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(deal.salePrice - totalPaid, 0);

    const visual = DEAL_STATUS_VISUALS[deal.status];

    // Mirrors DealDomainService.ensureCanExtendReservation: a limited number
    // of extensions, each to a later date within the company's maximum term.
    const extensionsLeft = reservationPolicy
        ? Math.max(reservationPolicy.reservationMaxExtensions - deal.reservationExtensionCount, 0)
        : null;
    const extendBounds = reservationPolicy ? reservationDateBounds(reservationPolicy) : null;
    const dayAfterCurrentExpiry = deal.reservationExpiresAt
        // UTC day, like reservationDateBounds — the picked day is sent as midnight UTC.
        ? new Date(new Date(deal.reservationExpiresAt).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;
    const extendMin = [extendBounds?.min, dayAfterCurrentExpiry]
        .filter((value): value is string => !!value)
        .sort()
        .at(-1);
    const extendMax = extendBounds?.max;
    const canExtend = extensionsLeft !== 0 && !(extendMin && extendMax && extendMin > extendMax);

    const openExtendDialog = () => {
        if (extendMin) setNewExpiry([parseDate(extendMin)]);
        setExtendOpen(true);
    };

    const paymentMethodCollection = createListCollection({
        items: Object.entries(PAYMENT_METHOD_LABEL_KEYS).map(([value, key]) => ({ label: t(key), value })),
    });

    const paymentTypeCollection = createListCollection({
        items: Object.entries(PAYMENT_TYPE_LABEL_KEYS).map(([value, key]) => ({ label: t(key), value })),
    });

    const isOpen = ["RESERVED", "CONTRACT_SIGNED", "ACTIVE"].includes(deal.status);
    const tab = TAB_VALUES.includes(searchParams.get("tab") as DealTab)
        ? (searchParams.get("tab") as DealTab)
        : defaultTabFor(deal.status);
    const setTab = (value: string) =>
        setSearchParams((params) => {
            params.set("tab", value);
            return params;
        }, { replace: true });

    const generateMenu = canGenerateDocuments && !["CANCELLED", "EXPIRED"].includes(deal.status) && (
        <Menu>
            <MenuTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={actions.generateDocument.isPending}
                    isLoading={actions.generateDocument.isPending}
                >
                    <FileTextIcon className="size-3.5" />
                    {t("detailsPage.generateDocument")}
                </Button>
            </MenuTrigger>
            <MenuContent>
                <MenuItem value="reservation" onSelect={() => actions.generateDocument.mutate("RESERVATION")}>
                    {t("detailsPage.generateReservation")}
                </MenuItem>
                {/* The contract template prints the contract number and date. */}
                {["CONTRACT_SIGNED", "ACTIVE", "COMPLETED"].includes(deal.status) && (
                    <MenuItem value="contract" onSelect={() => actions.generateDocument.mutate("CONTRACT")}>
                        {t("detailsPage.generateContract")}
                    </MenuItem>
                )}
            </MenuContent>
        </Menu>
    );

    return (
        <div className="space-y-6">
            {/* Header: who and what at a glance, and the one next step for this stage. */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-2xl font-semibold">{t("detailsPage.dealNumber", { number: deal.dealNumber })}</h1>
                        <Badge className={`${visual?.bg} text-white`}>{visual && t(visual.headingKey)}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                        {[
                            t("unitCard.unitNumber", { number: deal.unit.number }),
                            deal.project.name,
                            deal.client.fullName,
                        ].join(" · ")}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => navigate("/deals")}>
                        <ArrowLeft className="size-3"/>
                        {t("detailsPage.back")}
                    </Button>
                    {deal.status === "RESERVED" && (
                        <>
                            <Button
                                variant="secondary"
                                disabled={!canExtend}
                                title={!canExtend ? t("detailsPage.extendUnavailable") : undefined}
                                onClick={openExtendDialog}
                            >
                                {t("detailsPage.extendReservation")}
                            </Button>
                            <Button
                                onClick={() => setSignOpen(true)}
                                disabled={deal.discountApprovalStatus === "PENDING"}
                                title={deal.discountApprovalStatus === "PENDING" ? t("discountBanner.signBlocked") : undefined}
                            >
                                {t("detailsPage.signContract")}
                            </Button>
                        </>
                    )}
                    {deal.status === "CONTRACT_SIGNED" && (
                        <Button onClick={() => setActivateOpen(true)}>
                            {t("detailsPage.activateDeal")}
                        </Button>
                    )}
                    {deal.status === "ACTIVE" && (
                        deal.paymentSchedules.length === 0 ? (
                            <Button variant="secondary" onClick={() => setScheduleOpen(true)}>
                                {t("paymentSchedule.generate")}
                            </Button>
                        ) : null
                    )}
                    {deal.status === "ACTIVE" && (
                        <Button onClick={() => setPaymentOpen(true)}>{t("paymentsHistory.record")}</Button>
                    )}
                    {isOpen && (canCancel || deal.status === "ACTIVE") && (
                        <Menu>
                            <MenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={t("detailsPage.moreActions")}>
                                    <MoreVerticalIcon className="size-4" />
                                </Button>
                            </MenuTrigger>
                            <MenuContent>
                                {deal.status === "ACTIVE" && (
                                    <MenuItem value="complete" onSelect={() => actions.complete.mutate()}>
                                        {t("detailsPage.markCompleted")}
                                    </MenuItem>
                                )}
                                {deal.status === "ACTIVE" && canCancel && <MenuSeparator />}
                                {canCancel && (
                                    <MenuItem value="cancel" variant="destructive" onSelect={() => setCancelOpen(true)}>
                                        {t("detailsPage.cancelDeal")}
                                    </MenuItem>
                                )}
                            </MenuContent>
                        </Menu>
                    )}
                </div>
            </header>

            <DealStageTracker deal={deal} />

            <DealDiscountBanner
                deal={deal}
                canDecide={canDecideDiscount}
                isDeciding={actions.approveDiscount.isPending || actions.rejectDiscount.isPending}
                onApprove={() => actions.approveDiscount.mutate()}
                onReject={() => setRejectOpen(true)}
            />

            <DealKeyFigures deal={deal} totalPaid={totalPaid} remaining={remaining} />

            {/* Work area on the left, reference facts on the right; on a phone the
                facts come first, since that's where the client's number is. */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                    <Tabs value={tab} onValueChange={({ value }) => setTab(value)} className="gap-4">
                        <TabsList variant="underline" className="w-full justify-start overflow-x-auto">
                            <TabsTrigger value="payments" className="grow-0 px-3">
                                {t("tabs.payments")}
                                <TabCount count={deal.payments.length} />
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="grow-0 px-3">
                                {t("tabs.documents")}
                                <TabCount count={documentsCount} />
                            </TabsTrigger>
                            <TabsTrigger value="activity" className="grow-0 px-3">
                                {t("tabs.activity")}
                                <TabCount count={deal.activities.length} />
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="payments" className="space-y-4">
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
                        </TabsContent>

                        <TabsContent value="documents">
                            <EntityDocumentsCard ownerType="DEAL" ownerId={deal.id} headerActions={generateMenu} />
                        </TabsContent>

                        <TabsContent value="activity">
                            <DealHistoryCard activities={deal.activities} />
                        </TabsContent>
                    </Tabs>
                </div>

                <aside className="order-first min-w-0 space-y-4 lg:order-none">
                    <DealDetailsSidebar
                        deal={deal}
                        canReassign={canReassign}
                        onReassign={() => setReassignOpen(true)}
                    />
                    <DealTasksCard dealId={deal.id} />
                </aside>
            </div>

            {/* Activate dialog: there is no way back to CONTRACT_SIGNED. */}
            <Dialog open={activateOpen} onOpenChange={({ open }) => setActivateOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("detailsPage.activateDialogTitle")} description={t("detailsPage.activateDialogDescription")} />
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setActivateOpen(false)}>
                            {t("detailsPage.back")}
                        </Button>
                        <Button
                            disabled={actions.activate.isPending}
                            isLoading={actions.activate.isPending}
                            onClick={() => actions.activate.mutate(undefined, { onSuccess: () => setActivateOpen(false) })}
                        >
                            {t("detailsPage.activateDeal")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject discount dialog */}
            <Dialog open={rejectOpen} onOpenChange={({ open }) => setRejectOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("discountBanner.rejectDialogTitle")} description={t("discountBanner.rejectDialogDescription")} />
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>{t("discountBanner.rejectReason")}</FieldLabel>
                                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                            {t("detailsPage.back")}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={rejectReason.trim().length < 2 || actions.rejectDiscount.isPending}
                            isLoading={actions.rejectDiscount.isPending}
                            onClick={() =>
                                actions.rejectDiscount.mutate(rejectReason.trim(), {
                                    onSuccess: () => {
                                        setRejectOpen(false);
                                        setRejectReason("");
                                    },
                                })
                            }
                        >
                            {t("discountBanner.reject")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel dialog */}
            <Dialog open={cancelOpen} onOpenChange={({ open }) => setCancelOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("detailsPage.cancelDialogTitle")} description={t("detailsPage.cancelDialogDescription")} />
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>{t("detailsPage.reasonOptional")}</FieldLabel>
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
                            {t("detailsPage.back")}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={actions.cancel.isPending}
                            isLoading={actions.cancel.isPending}
                            onClick={() =>
                                actions.cancel.mutate(cancelReason || undefined, {
                                    onSuccess: () => {
                                        setCancelOpen(false);
                                        setCancelReason("");
                                    },
                                })
                            }
                        >
                            {t("detailsPage.confirmCancellation")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend dialog */}
            <Dialog open={extendOpen} onOpenChange={({ open }) => setExtendOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader
                        description={deal.reservationExpiresAt ? t("detailsPage.currentlyExpires", { date: formatDate(deal.reservationExpiresAt, i18n.language).date }) : undefined}
                        title={t("detailsPage.extendDialogTitle")}
                    />
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>{t("detailsPage.newDate")}</FieldLabel>
                                    <DatePicker
                                        onValueChange={({ value }) => setNewExpiry(value)}
                                        value={newExpiry}
                                        min={extendMin ? parseDate(extendMin) : undefined}
                                        max={extendMax ? parseDate(extendMax) : undefined}
                                    >
                                        <DatePickerTrigger asChild>
                                            <Button className="w-full flex justify-between" variant="outline">
                                                {formatDate(newExpiry[0].toString(), i18n.language).date}
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
                                    {reservationPolicy && extensionsLeft !== null && (
                                        <FieldDescription>
                                            {t("detailsPage.extensionsLeft", {
                                                left: extensionsLeft,
                                                max: reservationPolicy.reservationMaxExtensions,
                                                maxDays: reservationPolicy.reservationMaxDays,
                                            })}
                                        </FieldDescription>
                                    )}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setExtendOpen(false)}>
                            {t("detailsPage.back")}
                        </Button>
                        <Button
                            disabled={!newExpiry || actions.extend.isPending}
                            isLoading={actions.extend.isPending}
                            onClick={() =>
                                actions.extend.mutate(new Date(newExpiry[0].toString()).toISOString(), {
                                    onSuccess: () => {
                                        setExtendOpen(false);
                                        setNewExpiry([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
                                    },
                                })
                            }
                        >
                            {t("detailsPage.extend")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sign contract dialog */}
            <Dialog open={signOpen} onOpenChange={({ open }) => setSignOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("detailsPage.signDialogTitle")}/>
                    <DialogBody className="flex flex-col gap-3">
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>{t("detailsPage.contractNumberLabel")}</FieldLabel>
                                    <Input
                                        placeholder={t("detailsPage.contractNumberLabel")}
                                        value={contractNumber}
                                        onChange={(e) => setContractNumber(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>{t("detailsPage.contractDateLabel")}</FieldLabel>
                                    <DatePicker onValueChange={({ value }) => setContractDate(value)} value={contractDate}>
                                        <DatePickerTrigger asChild>
                                            <Button className="w-full flex justify-between" variant="outline">
                                                {formatDate(contractDate[0].toString(), i18n.language).date}
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
                            {t("detailsPage.back")}
                        </Button>
                        <Button
                            disabled={!contractNumber || !contractDate || actions.sign.isPending}
                            isLoading={actions.sign.isPending}
                            onClick={() =>

                                actions.sign.mutate(
                                    { contractNumber, contractDate: new Date(contractDate[0].toString()).toISOString() },
                                    {
                                        onSuccess: () => {
                                            setSignOpen(false);
                                            setContractNumber("");
                                            setContractDate([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
                                        }
                                    },
                                )
                            }
                        >
                            {t("detailsPage.sign")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate payment schedule dialog */}
            <Dialog open={scheduleOpen} onOpenChange={({ open }) => setScheduleOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("detailsPage.scheduleDialogTitle")}/>
                    <DialogBody className="flex flex-col gap-3">
                        <Field>
                            <FieldLabel>{t("detailsPage.numberOfInstallments")}</FieldLabel>
                            <NumberInput
                                value={String(installments)}
                                min={1}
                                onValueChange={({ valueAsNumber }) => setInstallments(Number.isNaN(valueAsNumber) ? 1 : valueAsNumber)}
                            >
                                <NumberInputGroup><NumberInputInput /></NumberInputGroup>
                            </NumberInput>
                        </Field>
                        <Field>
                            <FieldLabel>{t("detailsPage.firstPaymentDate")}</FieldLabel>
                            <DatePicker onValueChange={({ value }) => setFirstPaymentDate(value)} value={firstPaymentDate ?? []}>
                                <DatePickerTrigger asChild>
                                    <Button className="w-full flex justify-between" variant="outline">
                                        {formatDate(firstPaymentDate[0].toString(), i18n.language).date}
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
                            <FieldLabel>{t("detailsPage.intervalMonths")}</FieldLabel>
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
                        <Button variant="secondary" onClick={() => setScheduleOpen(false)}>{t("detailsPage.back")}</Button>
                        <Button
                            disabled={!installments || !firstPaymentDate || actions.generateSchedule.isPending}
                            isLoading={actions.generateSchedule.isPending}
                            onClick={() =>
                                actions.generateSchedule.mutate(
                                    { installments, firstPaymentDate: new Date(firstPaymentDate[0].toString()).toISOString(), intervalMonths },
                                    { onSuccess: () => setScheduleOpen(false) },
                                )
                            }
                        >
                            {t("detailsPage.generate")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record payment dialog */}
            <Dialog open={paymentOpen} onOpenChange={({ open }) => setPaymentOpen(open)}>
                <DialogContent size="sm">
                    <DialogHeader title={t("detailsPage.paymentDialogTitle")}/>
                    <DialogBody className="flex flex-col gap-3">
                        <Field>
                            <FieldLabel>{t("detailsPage.amount")}</FieldLabel>
                            <NumberInput
                                value={String(paymentAmount)}
                                min={0}
                                onValueChange={({ valueAsNumber }) => setPaymentAmount(Number.isNaN(valueAsNumber) ? 0 : valueAsNumber)}
                            >
                                <NumberInputGroup><NumberInputInput /></NumberInputGroup>
                            </NumberInput>
                        </Field>
                        <Field>
                            <FieldLabel>{t("detailsPage.paymentMethodLabel")}</FieldLabel>
                            <Select
                                collection={paymentMethodCollection}
                                value={paymentMethod ? [paymentMethod] : []}
                                onValueChange={({ value }) => setPaymentMethod((value[0] as PaymentMethod) ?? "")}
                            >
                                <SelectTrigger className="w-full"><SelectValue placeholder={t("detailsPage.selectMethod")} /></SelectTrigger>
                                <SelectContent>
                                    {paymentMethodCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>{t("detailsPage.paymentTypeLabel")}</FieldLabel>
                            <Select
                                collection={paymentTypeCollection}
                                value={paymentType ? [paymentType] : []}
                                onValueChange={({ value }) => setPaymentType((value[0] as PaymentType) ?? "")}
                            >
                                <SelectTrigger className="w-full"><SelectValue placeholder={t("detailsPage.selectType")} /></SelectTrigger>
                                <SelectContent>
                                    {paymentTypeCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>{t("detailsPage.paymentDate")}</FieldLabel>
                            <DatePicker onValueChange={({ value }) => setPaidAt(value)} value={paidAt ?? []}>
                                <DatePickerTrigger asChild>
                                    <Button className="w-full flex justify-between" variant="outline">
                                        {formatDate(paidAt[0].toString(), i18n.language).date}
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
                            <FieldLabel>{t("detailsPage.reference")}</FieldLabel>
                            <Input placeholder={t("detailsPage.referencePlaceholder")} value={reference} onChange={(e) => setReference(e.target.value)} />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setPaymentOpen(false)}>{t("detailsPage.back")}</Button>
                        <Button
                            disabled={!paymentAmount || !paymentMethod || !paymentType || !paidAt || actions.recordPayment.isPending}
                            isLoading={actions.recordPayment.isPending}
                            onClick={() =>
                                actions.recordPayment.mutate(
                                    {
                                        amount: paymentAmount,
                                        paymentMethod: paymentMethod as PaymentMethod,
                                        paymentType: paymentType as PaymentType,
                                        paidAt: new Date(paidAt[0].toString()).toISOString(),
                                        reference: reference || undefined,
                                    },
                                    {
                                        onSuccess: () => {
                                            setPaymentOpen(false);
                                            setPaymentAmount(0);
                                            setPaymentMethod("");
                                            setPaymentType("");
                                            setReference("");
                                            setPaidAt([parseDate(format(new Date().toString(), 'yyyy-MM-dd'))]);
                                        }
                                    },
                                )
                            }
                        >
                            {t("detailsPage.record")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassign manager dialog */}
            <ReassignManagerDialog
                open={reassignOpen}
                entityName={deal.dealNumber}
                branchId={deal.branchId}
                currentManagerId={deal.manager?.id ?? null}
                isSubmitting={actions.reassign.isPending}
                onOpenChange={setReassignOpen}
                onConfirm={(managerId) =>
                    actions.reassign.mutate({ managerId, previousManagerId: deal.manager?.id ?? null }, {
                        onSuccess: () => setReassignOpen(false),
                    })
                }
            />
        </div>
    );
}