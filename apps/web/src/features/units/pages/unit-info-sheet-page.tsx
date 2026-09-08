import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {PrinterIcon, LinkIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useUnit} from "@/features/units/hooks/use-unit.ts";
import {UNIT_STATUS_LABEL_KEYS, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

// SM-C1: a one-page, print-ready summary of a unit (price, floor plan
// location, key specs) so a manager can hand it to a client without
// manually compiling one in a chat message. No PDF library exists in this
// codebase yet, so "output as a PDF" is served by the browser's own
// print-to-PDF on this page, rather than adding a new dependency for one
// story. The link itself is shareable with anyone signed in to the tenant.
export function UnitInfoSheetPage() {
    const {unitId} = useParams<{unitId: string}>();
    const {t, i18n} = useTranslation(["units", "common"]);
    const {formatCurrency, formatPricePerSqm} = useCompanyFormatters();
    const unitQuery = useUnit(unitId);
    const unit = unitQuery.data;

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

    const pricePerSqm = parseFloat(unit.area) > 0 ? Math.round(parseFloat(unit.price) / parseFloat(unit.area)) : 0;
    const generatedAt = new Date().toLocaleDateString(i18n.language, {year: "numeric", month: "long", day: "numeric"});

    return (
        <div className="mx-auto max-w-2xl p-8">
            <div className="mb-6 flex justify-end gap-2 print:hidden">
                <Button variant="secondary" size="sm" onClick={copyLink}>
                    <LinkIcon className="size-4" />
                    {t("actions.copyLink", {ns: "common"})}
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                    <PrinterIcon className="size-4" />
                    {t("infoSheet.printButton")}
                </Button>
            </div>

            <div className="rounded-lg border border-secondary p-8">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t("infoSheet.title", {number: unit.number})}</h1>
                        {unit.project && <p className="text-muted-foreground">{unit.project.name}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("infoSheet.generatedAt", {date: generatedAt})}</p>
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
                            {[unit.block?.name, unit.entrance?.name, unit.floor && `${unit.floor.number}`]
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
                        <dd className="text-2xl font-semibold">{formatCurrency(parseFloat(unit.price))}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
