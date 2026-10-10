import {FileTextIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {type Unit,} from "@/features/units/types/unit.types.ts";
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
    const bookingClosedReason = closedProjectStatus
        ? t("details.bookingClosed", { status: t(PROJECT_STATUS_LABEL_KEYS[closedProjectStatus]) })
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
                    <div className="py-4">
                        <Tabs defaultValue="overview" className="gap-6">
                            <TabsList>
                                <TabsTrigger value="overview">{t("details.overviewTab")}</TabsTrigger>
                                <TabsTrigger value="deals">
                                    {t("details.dealsTab")}{deals.length > 0 && ` (${deals.length})`}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <UnitOverview unit={unit} floor={floor} />
                            </TabsContent>

                            <TabsContent value="deals">
                                {deals.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">{t("details.noDeals")}</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {deals.map((deal) => (
                                            <DealCard key={deal.id} deal={deal} />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
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