import {useSearchParams, useParams} from "react-router-dom";
import {createListCollection} from "@ark-ui/react";
import {useTranslation} from "react-i18next";
import {LinkIcon, PrinterIcon, TriangleAlertIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {UnitSummary} from "@/features/units/components/unit-summary.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field, FieldLabel} from "@/components/ui/field.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {addDays, buildPaymentPlan} from "@/features/units/utils/payment-plan.ts";
import {BLOCK_SALES_STATUS_LABEL_KEYS, BlockSalesStatus, completionQuarter} from "@/features/blocks/types/block-sales.ts";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useUnit} from "@/features/units/hooks/use-unit.ts";
import {UNIT_STATUS_LABEL_KEYS, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {KeregeLogo} from "@/components/shared/kerege-logo.tsx";
import {formatDay} from "@/utils/date-formatter.ts";

const INTERVALS = [1, 3, 6] as const;

/** A whole number from the query string, within bounds, or the fallback. */
function intParam(value: string | null, fallback: number, min: number, max: number) {
    const n = Number(value);
    return value !== null && value !== "" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

const isDay = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

// SM-C1: a one-page, print-ready summary of a unit (price, floor plan
// location, key specs) so a manager can hand it to a client without
// manually compiling one in a chat message. No PDF library exists in this
// codebase yet, so "output as a PDF" is served by the browser's own
// print-to-PDF on this page, rather than adding a new dependency for one
// story. The link itself is shareable with anyone signed in to the tenant.
//
// It doubles as a price offer: the manager sets who it's for, how long the
// price holds and an installment plan, and the sheet prints with both
// payment options and the manager's contacts. The settings live in the URL,
// so a copied link opens the same offer.
export function UnitInfoSheetPage() {
    const {unitId} = useParams<{unitId: string}>();
    const {t} = useTranslation(["units", "common"]);
    const {formatCurrency, formatPricePerSqm, formatArea} = useCompanyFormatters();
    const {user} = useAuth();
    const unitQuery = useUnit(unitId);
    const unit = unitQuery.data;

    const [params, setParams] = useSearchParams();
    const today = new Date();
    const offer = {
        client: params.get("client") ?? "",
        validUntil: isDay(params.get("valid")) ? params.get("valid")! : addDays(today, 7),
        downPercent: intParam(params.get("down"), 30, 0, 100),
        installments: intParam(params.get("n"), 12, 1, 120),
        intervalMonths: intParam(params.get("every"), 1, 1, 12),
        firstPaymentDay: isDay(params.get("first")) ? params.get("first")! : addDays(today, 30),
        showPlan: params.get("plan") !== "0",
    };
    const setParam = (key: string, value: string) =>
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value === "") next.delete(key); else next.set(key, value);
            return next;
        }, {replace: true});

    const intervalCollection = createListCollection({
        items: INTERVALS.map((months) => ({label: t("offer.every", {count: months}), value: String(months)})),
    });

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success({title: t("actions.linkCopied", {ns: "common"})});
        } catch {
            // Clipboard access can be denied by the browser; the link is
            // already visible in the address bar as a fallback.
        }
    };

    if (unitQuery.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (!unit) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                {t("infoSheet.notFound")}
            </div>
        );
    }

    const price = parseFloat(unit.price);
    const pricePerSqm = parseFloat(unit.area) > 0 ? Math.round(price / parseFloat(unit.area)) : 0;
    const longDate = (value: Date) => formatDay(value);
    const dayToDate = (day: string) => {
        const [y, m, d] = day.split("-").map(Number);
        return new Date(y, m - 1, d);
    };
    const shortDay = (day: string) => formatDay(dayToDate(day));
    const generatedAt = longDate(today);

    const plan = buildPaymentPlan({
        price,
        downPaymentPercent: offer.downPercent,
        installments: offer.installments,
        intervalMonths: offer.intervalMonths,
        firstPaymentDay: offer.firstPaymentDay,
    });
    const hasPlan = offer.showPlan && plan.rows.length > 0;
    // Equal installments, except the last one may differ by the rounding.
    const regular = plan.rows[0]?.amount ?? 0;
    const last = plan.rows[plan.rows.length - 1];

    // The unit sheet's own way of listing facts: label column, value column.
    const specs: {label: string; value: string}[] = [
        ...(unit.project?.address ? [{label: t("infoSheet.address"), value: unit.project.address}] : []),
        {
            label: t("infoSheet.location"),
            value: [unit.block?.name, unit.entrance?.name, unit.floor && t("infoSheet.floor", {number: unit.floor.number})]
                .filter(Boolean)
                .join(" / ") || "—",
        },
        // Clients weigh a finished block against one due later.
        ...(unit.block?.completionDate || unit.block?.salesStatus === BlockSalesStatus.COMPLETED
            ? [{
                label: t("infoSheet.completion"),
                value: (unit.block.salesStatus === BlockSalesStatus.COMPLETED
                    ? [t(BLOCK_SALES_STATUS_LABEL_KEYS.COMPLETED), completionQuarter(t, unit.block.completionDate)].filter(Boolean).join(" · ")
                    : completionQuarter(t, unit.block.completionDate)) || "—",
            }]
            : []),
        {label: t("infoSheet.type"), value: t(UNIT_TYPE_LABEL_KEYS[unit.type])},
        {label: t("infoSheet.rooms"), value: unit.rooms != null ? String(unit.rooms) : "—"},
        {label: t("infoSheet.area"), value: formatArea(unit.area)},
        {label: t("infoSheet.pricePerSqm"), value: formatPricePerSqm(pricePerSqm)},
    ];

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
            <Card className="print:hidden">
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-lg font-semibold">{t("offer.settings")}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={copyLink}>
                            <LinkIcon />
                            {t("actions.copyLink", {ns: "common"})}
                        </Button>
                        <Button size="sm" onClick={() => window.print()}>
                            <PrinterIcon />
                            {t("infoSheet.printButton")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel>{t("offer.client")}</FieldLabel>
                            <Input value={offer.client} placeholder={t("offer.clientPlaceholder")} onChange={(e) => setParam("client", e.target.value)} />
                        </Field>
                        <Field>
                            <FieldLabel>{t("offer.validUntil")}</FieldLabel>
                            <DateField value={offer.validUntil} onChange={(value) => setParam("valid", value)} />
                        </Field>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            ids={{hiddenInput: "offer-include-plan"}}
                            checked={offer.showPlan}
                            onCheckedChange={({checked}) => setParam("plan", checked === true ? "" : "0")}
                        />
                        <label htmlFor="offer-include-plan" className="cursor-pointer text-sm font-medium">
                            {t("offer.includePlan")}
                        </label>
                    </div>
                    {offer.showPlan && (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                            <Field>
                                <FieldLabel>{t("offer.downPayment")}</FieldLabel>
                                <Input type="number" inputMode="numeric" min={0} max={100} value={offer.downPercent} onChange={(e) => setParam("down", e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>{t("offer.installments")}</FieldLabel>
                                <Input type="number" inputMode="numeric" min={1} max={120} value={offer.installments} onChange={(e) => setParam("n", e.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>{t("offer.interval")}</FieldLabel>
                                <Select
                                    collection={intervalCollection}
                                    value={[String(offer.intervalMonths)]}
                                    onValueChange={({value}) => setParam("every", value[0] ?? "1")}
                                >
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {intervalCollection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>{t("offer.firstPayment")}</FieldLabel>
                                <DateField value={offer.firstPaymentDay} onChange={(value) => setParam("first", value)} />
                            </Field>
                        </div>
                    )}
                    {unit.status !== "AVAILABLE" && (
                        <Alert variant="warning">
                            <TriangleAlertIcon />
                            <AlertTitle className="font-normal">
                                {t("offer.notAvailable", {status: t(UNIT_STATUS_LABEL_KEYS[unit.status])})}
                            </AlertTitle>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* The offer itself. On paper it drops the card chrome but keeps
                the status colours, so it prints as one clean sheet. */}
            <Card className="gap-6 print:gap-5 print:rounded-none print:border-0 print:bg-none print:py-0 print:shadow-none print:[print-color-adjust:exact] print:[--space:0px]">
                <CardHeader className="flex items-center justify-between gap-4 border-b pb-6">
                    <KeregeLogo className="h-7" />
                    <div className="text-right text-xs text-muted-foreground">
                        <p>{t("infoSheet.generatedAt", {date: generatedAt})}</p>
                        {offer.client.trim() && <p>{t("offer.preparedFor", {name: offer.client.trim()})}</p>}
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6 print:gap-5">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold">{t("infoSheet.title", {number: unit.number})}</h1>
                            {unit.project && <p className="text-sm text-muted-foreground">{unit.project.name}</p>}
                        </div>
                        <UnitSummary
                            status={unit.status}
                            price={price}
                            details={[
                                t(UNIT_TYPE_LABEL_KEYS[unit.type]),
                                formatArea(unit.area),
                                formatPricePerSqm(pricePerSqm),
                            ]}
                        />
                    </div>

                    <div className="rounded-lg border border-secondary px-4 py-2">
                        <DataList className="divide-y">
                            {specs.map((spec) => (
                                <DataListItem key={spec.label}>
                                    <DataListItemLabel>{spec.label}</DataListItemLabel>
                                    <DataListItemValue>{spec.value}</DataListItemValue>
                                </DataListItem>
                            ))}
                        </DataList>
                    </div>

                    {hasPlan && (
                        <section className="flex flex-col gap-4 break-inside-avoid">
                            <h2 className="font-semibold">{t("offer.paymentOptions")}</h2>
                            <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                                <div className="flex flex-col gap-1 rounded-lg border border-secondary p-4">
                                    <p className="text-sm text-muted-foreground">{t("offer.fullPayment")}</p>
                                    <p className="text-xl font-semibold tabular-nums">{formatCurrency(price)}</p>
                                </div>
                                <div className="flex flex-col gap-1 rounded-lg border border-secondary p-4">
                                    <p className="text-sm text-muted-foreground">{t("offer.installmentPlan")}</p>
                                    <p>
                                        <span className="text-xl font-semibold tabular-nums">{formatCurrency(regular)}</span>{" "}
                                        <span className="text-sm text-muted-foreground">{t("offer.perInstallment")}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("offer.planSummary", {
                                            down: formatCurrency(plan.downPayment),
                                            percent: offer.downPercent,
                                            count: plan.rows.length,
                                            every: t("offer.every", {count: offer.intervalMonths}).toLowerCase(),
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-secondary px-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">№</TableHead>
                                            <TableHead>{t("offer.dueDate")}</TableHead>
                                            <TableHead className="text-right">{t("offer.amount")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="tabular-nums">
                                        {plan.downPayment > 0 && (
                                            <TableRow>
                                                <TableCell>—</TableCell>
                                                <TableCell>{t("offer.downPaymentRow")}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(plan.downPayment)}</TableCell>
                                            </TableRow>
                                        )}
                                        {plan.rows.map((row) => (
                                            <TableRow key={row.order}>
                                                <TableCell>{row.order}</TableCell>
                                                <TableCell>{shortDay(row.dueDay)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter className="bg-transparent">
                                        <TableRow>
                                            <TableCell colSpan={2} className="font-semibold">{t("offer.total")}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(price)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                            {last && last.amount !== regular && (
                                <p className="-mt-2 text-xs text-muted-foreground">{t("offer.lastDiffers")}</p>
                            )}
                        </section>
                    )}
                </CardContent>

                <CardFooter className="flex-col items-stretch gap-3 bg-transparent text-sm">
                    {user && (
                        <div>
                            <p className="text-xs text-muted-foreground">{t("offer.yourManager")}</p>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-muted-foreground">{[user.phone, user.email].filter(Boolean).join(" · ")}</p>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        {t("offer.validNote", {date: longDate(dayToDate(offer.validUntil))})}
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
