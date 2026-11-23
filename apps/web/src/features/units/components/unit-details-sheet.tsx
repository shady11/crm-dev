import {FileTextIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {type Unit, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {UnitSummary} from "@/features/units/components/unit-summary.tsx";
import {DealCard} from "@/features/deals/components/deal-card.tsx";
import {UnitOverview} from "@/features/units/components/unit-overview.tsx";
import {useUnit} from "@/features/units/hooks/use-unit.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {
    BOOKABLE_PROJECT_STATUSES,
    isProjectStatus,
    PROJECT_STATUS_LABEL_KEYS,
} from "@/features/projects/types/project.types.ts";
import {completionQuarter, isBlockBookable} from "@/features/blocks/types/block-sales.ts";
import {Link} from "react-router-dom";
import {TagIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface UnitDetailsSheetProps {
    unit: Unit | null;
    floor: Floor | null;

    open: boolean;

    onOpenChange(open: boolean): void;
    onEdit(): void;
    onBook(): void;
}

export function UnitDetailsSheet({
                                     unit,
                                     floor,
                                     open,
                                     onOpenChange,
                                     onEdit,
                                     onBook,
                                 }: UnitDetailsSheetProps) {

    const { t } = useTranslation("units");
    const { user } = useAuth();
    const { formatCurrency, formatArea } = useCompanyFormatters();
    const unitDetailsQuery = useUnit(open ? unit?.id : undefined);
    const fullUnit = unitDetailsQuery.data ?? unit;

    // Matches the API: editing a unit needs units.edit, reserving one via a
    // deal (POST /deals/reserve) needs deals.create.
    const canEdit = hasPermission(user, "units.edit");
    const canBook = hasPermission(user, "deals.create");

    // The API refuses bookings in projects that are not open for sales. The
    // status arrives with the full unit; until then the button stays enabled
    // and the API remains the gate.
    const projectStatus = fullUnit?.project?.status;
    const closedProjectStatus = isProjectStatus(projectStatus) && !BOOKABLE_PROJECT_STATUSES.includes(projectStatus)
        ? projectStatus
        : null;
    // Same for a block that isn't on sale yet.
    const block = fullUnit?.block;
    const blockQuarter = completionQuarter(t, block?.completionDate);
    const bookingClosedReason = closedProjectStatus
        ? t("details.bookingClosed", { status: t(PROJECT_STATUS_LABEL_KEYS[closedProjectStatus]) })
        : block && !isBlockBookable(block.salesStatus)
            ? t("details.blockNotOnSale", {
                block: block.name,
                completion: blockQuarter ? t("details.blockNotOnSaleCompletion", { quarter: blockQuarter }) : "",
            })
            : null;

    if (!unit || !floor) {
        return null;
    }

    const deals = fullUnit?.deals ?? [];

    return (
        <Sheet open={open} onOpenChange={({ open }) => onOpenChange(open)}>
            <SheetContent className="sm:max-w-lg" variant="inset">
                <SheetHeader>
                    <SheetTitle>{t("sheets.detailsTitle", { number: unit.number })}</SheetTitle>
                </SheetHeader>

                <SheetBody scrollFade>
                    {/* At a glance: the status colour, the price and the status. */}
                    <UnitSummary
                        className="pt-4 pb-2"
                        status={unit.status}
                        price={parseFloat(unit.price)}
                        details={[
                            unit.rooms != null ? t("chessboard.rooms", { count: unit.rooms }) : null,
                            t(UNIT_TYPE_LABEL_KEYS[unit.type]),
                            formatArea(unit.area),
                        ].filter((item): item is string => !!item)}
                    />
                    {fullUnit?.pendingPriceRequest ? (
                        // SH-2: the unit keeps its price until an approver decides.
                        <Alert variant="warning" className="mt-4">
                            <TagIcon />
                            <AlertTitle>
                                {t("details.pendingPriceTitle", {price: formatCurrency(fullUnit.pendingPriceRequest.requestedPrice)})}
                            </AlertTitle>
                            <AlertDescription>
                                {t("details.pendingPriceDescription", {
                                    name: fullUnit.pendingPriceRequest.requestedBy?.fullName ?? "—",
                                    price: formatCurrency(fullUnit.pendingPriceRequest.currentPrice),
                                })}
                                {hasPermission(user, "units.approve_price") ? (
                                    <>
                                        {" "}
                                        <Link to={paths.priceChanges} className="font-medium underline">{t("details.reviewPriceChange")}</Link>
                                    </>
                                ) : null}
                            </AlertDescription>
                        </Alert>
                    ) : null}
                    {/* Details, then the unit's deals underneath. */}
                    <div className="space-y-6 py-4">
                        <UnitOverview unit={unit} floor={floor} />

                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">
                                {t("details.dealsTab")}{deals.length > 0 && ` (${deals.length})`}
                            </h3>
                            {deals.length === 0 ? (
                                <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">{t("details.noDeals")}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {deals.map((deal) => (
                                        <DealCard key={deal.id} deal={deal} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                    {unit.status === "AVAILABLE" && canBook && bookingClosedReason && (
                        <p className="pb-4 text-sm text-muted-foreground">{bookingClosedReason}</p>
                    )}
                </SheetBody>

                <SheetFooter>
                    <Button
                        variant="secondary"
                        title={t("details.infoSheetButton")}
                        onClick={() => window.open(paths.units.infoSheet(unit.id), "_blank", "noopener,noreferrer")}
                    >
                        <FileTextIcon className="size-4" />
                        {t("details.offerButton")}
                    </Button>
                    {canEdit && (
                        <Button variant="secondary" className="flex-1" onClick={onEdit}>{t("common:actions.edit")}</Button>
                    )}
                    {unit.status === "AVAILABLE" && canBook && (
                        <Button
                            className="flex-1"
                            disabled={!!bookingClosedReason}
                            title={bookingClosedReason ?? undefined}
                            onClick={onBook}
                        >
                            {t("details.bookButton")}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}