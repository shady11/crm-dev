import {useState} from "react";
import {Link} from "react-router-dom";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {createListCollection} from "@ark-ui/react";
import {Download, FileSpreadsheet, Loader2, Search, WalletIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {DealsPagination} from "@/features/deals/components/deals-pagination.tsx";
import {PAYMENT_METHOD_LABEL_KEYS, PAYMENT_TYPE_LABEL_KEYS} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";
import type {PaymentMethod, PaymentType} from "@/features/deals/api/deals.api";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useDebouncedValue} from "@/hooks/use-debounced-value.ts";
import {paths} from "@/routes/paths";
import {
    downloadPaymentsExport,
    downloadReceivablesExport,
    getPaymentRegister,
    type PaymentRegisterFilters,
} from "@/features/payments/api/payments.api.ts";

type Period = "thisMonth" | "lastMonth" | "last30Days" | "custom";
const PERIODS: Period[] = ["thisMonth", "lastMonth", "last30Days", "custom"];

/** YYYY-MM-DD of a local calendar day, the form payment dates are entered in. */
function day(date: Date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

function periodRange(period: Exclude<Period, "custom">): {from: string; to: string} {
    const now = new Date();
    if (period === "lastMonth") {
        return {
            from: day(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            to: day(new Date(now.getFullYear(), now.getMonth(), 0)),
        };
    }
    if (period === "last30Days") {
        return {from: day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: day(now)};
    }
    return {from: day(new Date(now.getFullYear(), now.getMonth(), 1)), to: day(now)};
}

/**
 * FIN-2: every payment across deals, for reconciling a period against the
 * bank statement or the cash book, with Excel exports of the payments and
 * of what clients still owe.
 */
export function PaymentsPage() {
    const {t, i18n} = useTranslation(["payments", "deals"]);
    const {formatCurrency} = useCompanyFormatters();
    const projects = useProjectsFilter();

    const [period, setPeriod] = useState<Period>("thisMonth");
    const [custom, setCustom] = useState(() => periodRange("thisMonth"));
    const [branchId, setBranchId] = useState<string | undefined>();
    const [projectId, setProjectId] = useState<string | undefined>();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>();
    const [paymentType, setPaymentType] = useState<PaymentType | undefined>();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [exporting, setExporting] = useState<"payments" | "receivables" | null>(null);

    const debouncedSearch = useDebouncedValue(search);
    const range = period === "custom" ? custom : periodRange(period);
    const filters: PaymentRegisterFilters = {
        ...range,
        branchId,
        projectId,
        paymentMethod,
        paymentType,
        search: debouncedSearch || undefined,
    };

    const register = useQuery({
        queryKey: ["payments", "register", filters, page, limit],
        queryFn: () => getPaymentRegister({...filters, page, limit}),
        placeholderData: keepPreviousData,
    });

    // Any filter change starts again from the first page.
    const update = <T,>(setter: (value: T) => void) => (value: T) => {
        setter(value);
        setPage(1);
    };

    const runExport = async (kind: "payments" | "receivables") => {
        setExporting(kind);
        try {
            if (kind === "payments") await downloadPaymentsExport(filters);
            else await downloadReceivablesExport({branchId, projectId});
        } catch {
            toast.error({title: t("page.exportError")});
        } finally {
            setExporting(null);
        }
    };

    const periodCollection = createListCollection({
        items: PERIODS.map((value) => ({label: t(`page.period.${value}`), value})),
    });
    const projectCollection = createListCollection({
        items: [{label: t("toolbar.allProjects", {ns: "deals"}), value: "all"}, ...projects.data.map((p) => ({label: p.name, value: p.id}))],
    });
    const methodCollection = createListCollection({
        items: [{label: t("page.allMethods"), value: "all"}, ...Object.entries(PAYMENT_METHOD_LABEL_KEYS).map(([value, key]) => ({label: t(key), value}))],
    });
    const typeCollection = createListCollection({
        items: [{label: t("page.allTypes"), value: "all"}, ...Object.entries(PAYMENT_TYPE_LABEL_KEYS).map(([value, key]) => ({label: t(key), value}))],
    });

    const items = register.data?.items ?? [];
    const totals = register.data?.totals;
    const date = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
    const amountClass = (amount: number) => (amount < 0 ? "text-rose-600" : "");

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("page.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("page.subtitle")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => runExport("receivables")} disabled={exporting !== null}>
                        {exporting === "receivables" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                        {t("page.exportReceivables")}
                    </Button>
                    <Button onClick={() => runExport("payments")} disabled={exporting !== null}>
                        {exporting === "payments" ? <Loader2 className="animate-spin" /> : <Download />}
                        {t("page.exportPayments")}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Select collection={periodCollection} value={[period]} onValueChange={({value}) => update(setPeriod)((value[0] ?? "thisMonth") as Period)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {periodCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {period === "custom" && (
                    <>
                        <DateField className="w-40" value={custom.from} max={custom.to} onChange={(from) => update(setCustom)({...custom, from})} />
                        <span className="text-muted-foreground">–</span>
                        <DateField className="w-40" value={custom.to} min={custom.from} max={day(new Date())} onChange={(to) => update(setCustom)({...custom, to})} />
                    </>
                )}
                <BranchFilterSelect value={branchId ?? "all"} onChange={(value) => update(setBranchId)(value === "all" ? undefined : value)} />
                <Select collection={projectCollection} value={[projectId ?? "all"]} onValueChange={({value}) => update(setProjectId)(value[0] === "all" ? undefined : value[0])}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {projectCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select collection={methodCollection} value={[paymentMethod ?? "all"]} onValueChange={({value}) => update(setPaymentMethod)(value[0] === "all" ? undefined : (value[0] as PaymentMethod))}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {methodCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select collection={typeCollection} value={[paymentType ?? "all"]} onValueChange={({value}) => update(setPaymentType)(value[0] === "all" ? undefined : (value[0] as PaymentType))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {typeCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <InputGroup className="w-64">
                    <InputGroupInput placeholder={t("page.searchPlaceholder")} value={search} onChange={(e) => update(setSearch)(e.target.value)} />
                    <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
                </InputGroup>
            </div>

            {totals && (
                <Card className="border border-secondary shadow-none">
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Figure label={t("page.totals.received")} value={formatCurrency(totals.received)} />
                            <Figure label={t("page.totals.refunded")} value={formatCurrency(totals.refunded)} className={totals.refunded > 0 ? "text-rose-600" : ""} />
                            <Figure label={t("page.totals.net")} value={formatCurrency(totals.net)} />
                            <Figure label={t("page.totals.count")} value={String(totals.count)} />
                        </div>
                        {totals.byMethod.some((m) => m.amount !== 0) && (
                            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {totals.byMethod.filter((m) => m.amount !== 0).map((m) => (
                                    <span key={m.method}>{t(PAYMENT_METHOD_LABEL_KEYS[m.method])}: <span className="font-medium text-foreground tabular-nums">{formatCurrency(m.amount)}</span></span>
                                ))}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <DataTable
                isLoading={register.isLoading}
                isEmpty={items.length === 0}
                emptyIcon={<WalletIcon strokeWidth={1.25} />}
                emptyTitle={t("page.emptyTitle")}
                emptyDescription={t("page.emptyDescription")}
                cards={items.map((p) => (
                    <div key={p.id} className="rounded-lg border border-secondary p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <Link to={paths.deals.payments(p.deal.id)} className="font-medium hover:underline">{p.deal.dealNumber}</Link>
                                <p className="truncate text-xs text-muted-foreground">{p.client.fullName}</p>
                            </div>
                            <p className={`shrink-0 font-medium tabular-nums ${amountClass(p.amount)}`}>{formatCurrency(p.amount)}</p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {date(p.paidAt)} · {t(PAYMENT_TYPE_LABEL_KEYS[p.paymentType])} · {t(PAYMENT_METHOD_LABEL_KEYS[p.paymentMethod])}
                            {p.reference && ` · ${p.reference}`}
                        </p>
                    </div>
                ))}
            >
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">{t("page.table.date")}</TableHead>
                        <TableHead>{t("page.table.deal")}</TableHead>
                        <TableHead>{t("page.table.unit")}</TableHead>
                        <TableHead>{t("page.table.type")}</TableHead>
                        <TableHead>{t("page.table.method")}</TableHead>
                        <TableHead>{t("page.table.recordedBy")}</TableHead>
                        <TableHead className="pr-4 text-right">{t("page.table.amount")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell className="pl-4 tabular-nums">{date(p.paidAt)}</TableCell>
                            <TableCell>
                                <Link to={paths.deals.payments(p.deal.id)} className="font-medium hover:underline">{p.deal.dealNumber}</Link>
                                <p className="text-xs text-muted-foreground">{p.client.fullName}</p>
                            </TableCell>
                            <TableCell>
                                <p>№{p.unitNumber}</p>
                                <p className="text-xs text-muted-foreground">{[p.projectName, p.branchName].filter(Boolean).join(" · ")}</p>
                            </TableCell>
                            <TableCell>{t(PAYMENT_TYPE_LABEL_KEYS[p.paymentType])}</TableCell>
                            <TableCell>
                                <p>{t(PAYMENT_METHOD_LABEL_KEYS[p.paymentMethod])}</p>
                                {p.reference && <p className="text-xs text-muted-foreground">{p.reference}</p>}
                            </TableCell>
                            <TableCell>{p.recordedBy?.fullName ?? "—"}</TableCell>
                            <TableCell className={`pr-4 text-right font-medium tabular-nums ${amountClass(p.amount)}`}>{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </DataTable>

            <DealsPagination
                page={page}
                limit={limit}
                total={register.data?.meta.total ?? 0}
                onPageChange={setPage}
                onLimitChange={update(setLimit)}
            />
        </div>
    );
}

function Figure({label, value, className = ""}: {label: string; value: string; className?: string}) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-semibold tabular-nums ${className}`}>{value}</p>
        </div>
    );
}
