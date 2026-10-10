import {useSearchParams, useParams} from "react-router-dom";
import {createListCollection} from "@ark-ui/react";
import {useTranslation} from "react-i18next";
import {PrinterIcon, LinkIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field, FieldLabel} from "@/components/ui/field.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {addDays, buildPaymentPlan} from "@/features/units/utils/payment-plan.ts";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useUnit} from "@/features/units/hooks/use-unit.ts";
import {UNIT_STATUS_LABEL_KEYS, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {KeregeLogo} from "@/components/shared/kerege-logo.tsx";

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
    const {t, i18n} = useTranslation(["units", "common"]);
    const {formatCurrency, formatPricePerSqm} = useCompanyFormatters();
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
    const longDate = (value: Date) => value.toLocaleDateString(i18n.language, {year: "numeric", month: "long", day: "numeric"});
    const dayToDate = (day: string) => {
        const [y, m, d] = day.split("-").map(Number);
        return new Date(y, m - 1, d);
    };
    const shortDay = (day: string) => dayToDate(day).toLocaleDateString(i18n.language, {year: "numeric", month: "short", day: "numeric"});
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

    return (
        <div className="mx-auto max-w-2xl p-8">
            <div className="mb-6 space-y-4 rounded-lg border border-secondary p-4 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">{t("offer.settings")}</h2>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={copyLink}>
                            <LinkIcon className="size-4" />
                            {t("actions.copyLink", {ns: "common"})}
                        </Button>
                        <Button size="sm" onClick={() => window.print()}>
                            <PrinterIcon className="size-4" />
                            {t("infoSheet.printButton")}
                        </Button>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                        <FieldLabel>{t("offer.client")}</FieldLabel>
                        <Input value={offer.client} placeholder={t("offer.clientPlaceholder")} onChange={(e) => setParam("client", e.target.value)} />
                    </Field>
                    <Field>
                        <FieldLabel>{t("offer.validUntil")}</FieldLabel>
                        <DateField value={offer.validUntil} onChange={(value) => setParam("valid", value)} />
                    </Field>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={offer.showPlan}
                        onChange={(e) => setParam("plan", e.target.checked ? "" : "0")}
                    />
                    {t("offer.includePlan")}
                </label>
                {offer.showPlan && (
                    <div className="grid gap-3 sm:grid-cols-4">
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
                    <p className="text-sm text-warning-foreground">{t("offer.notAvailable", {status: t(UNIT_STATUS_LABEL_KEYS[unit.status])})}</p>
                )}
            </div>

            <div className="rounded-lg border border-secondary p-8">
                <div className="mb-8 border-b pb-6">
                    <KeregeLogo className="h-7" />
                </div>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">{t("infoSheet.title", {number: unit.number})}</h1>
                        {unit.project && <p className="text-muted-foreground">{unit.project.name}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>{t("infoSheet.generatedAt", {date: generatedAt})}</p>
                        {offer.client.trim() && <p>{t("offer.preparedFor", {name: offer.client.trim()})}</p>}
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {unit.project?.address && (
                        <div className="col-span-2">
                            <dt className="text-muted-foreground">{t("infoSheet.address")}</dt>
                            <dd className="font-medium">{unit.project.address}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.location")}</dt>
                        <dd className="font-medium">
                            {[unit.block?.name, unit.entrance?.name, unit.floor && t("infoSheet.floor", {number: unit.floor.number})]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.type")}</dt>
                        <dd className="font-medium">{t(UNIT_TYPE_LABEL_KEYS[unit.type])}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.rooms")}</dt>
                        <dd className="font-medium">{unit.rooms ?? "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.area")}</dt>
                        <dd className="font-medium">{parseFloat(unit.area).toFixed(1)} m²</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.status")}</dt>
                        <dd className="font-medium">{t(UNIT_STATUS_LABEL_KEYS[unit.status])}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">{t("infoSheet.pricePerSqm")}</dt>
                        <dd className="font-medium">{formatPricePerSqm(pricePerSqm)}</dd>
                    </div>
                    <div className="col-span-2 mt-2 border-t pt-4">
                        <dt className="text-muted-foreground">{t("infoSheet.price")}</dt>
                        <dd className="text-2xl font-semibold">{formatCurrency(price)}</dd>
                    </div>
                </dl>

                {hasPlan && (
                    <section className="mt-6 border-t pt-4 break-inside-avoid">
                        <h2 className="mb-3 font-semibold">{t("offer.paymentOptions")}</h2>
                        <div className="grid gap-3 text-sm sm:grid-cols-2 print:grid-cols-2">
                            <div className="rounded-md border p-3">
                                <p className="text-muted-foreground">{t("offer.fullPayment")}</p>
                                <p className="text-lg font-semibold">{formatCurrency(price)}</p>
                            </div>
                            <div className="rounded-md border p-3">
                                <p className="text-muted-foreground">{t("offer.installmentPlan")}</p>
                                <p>
                                    <span className="text-lg font-semibold">{formatCurrency(regular)}</span>{" "}
                                    <span className="text-muted-foreground">{t("offer.perInstallment")}</span>
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
                        <table className="mt-4 w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="py-1.5 font-normal">№</th>
                                    <th className="py-1.5 font-normal">{t("offer.dueDate")}</th>
                                    <th className="py-1.5 text-right font-normal">{t("offer.amount")}</th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums">
                                {plan.downPayment > 0 && (
                                    <tr className="border-b">
                                        <td className="py-1.5">—</td>
                                        <td className="py-1.5">{t("offer.downPaymentRow")}</td>
                                        <td className="py-1.5 text-right font-medium">{formatCurrency(plan.downPayment)}</td>
                                    </tr>
                                )}
                                {plan.rows.map((row) => (
                                    <tr key={row.order} className="border-b last:border-0">
                                        <td className="py-1.5">{row.order}</td>
                                        <td className="py-1.5">{shortDay(row.dueDay)}</td>
                                        <td className="py-1.5 text-right">{formatCurrency(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t font-semibold">
                                    <td className="py-1.5" colSpan={2}>{t("offer.total")}</td>
                                    <td className="py-1.5 text-right">{formatCurrency(price)}</td>
                                </tr>
                            </tfoot>
                        </table>
                        {last && last.amount !== regular && (
                            <p className="mt-1 text-xs text-muted-foreground">{t("offer.lastDiffers")}</p>
                        )}
                    </section>
                )}

                <footer className="mt-6 space-y-3 border-t pt-4 text-sm">
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
                </footer>
            </div>
        </div>
    );
}
