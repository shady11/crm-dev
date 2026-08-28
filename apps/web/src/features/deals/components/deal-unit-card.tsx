import {HouseIcon} from "lucide-react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {UNIT_TYPE_LABELS} from "@/features/units/types/unit.types.ts";
import {useTranslation} from "react-i18next";
import {useFormatters} from "@/lib/i18n/formatters.ts";

export function DealUnitCard({
                                 unit,
                                 project,
                                 companySettings
}: {
    unit: Deal["unit"];
    project: Deal["project"];
    companySettings?: { currency?: string | null; locale?: string | null };
}) {
    const { t } = useTranslation(["deals", "common"]);
    const { formatCurrency } = useFormatters(companySettings);

    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title={t("financials.title", { ns: "deals" })} className="py-4 border-b gap-0"></CardHeader>
            <CardContent className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-2.5">
                        <HouseIcon size={24} strokeWidth={1.25} className="text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-medium">
                                        {t("unitCard.unitNumber", { ns: "deals", number: unit.number })}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {project.name}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.block && `${t("labels.block", { ns: "common" })} ${unit.block.name}`}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.entrance && `${t("labels.entrance", { ns: "common" })} ${unit.entrance.name}`}
                                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                                    {unit.floor && t("unitCard.floor", { ns: "deals", floor: unit.floor.number })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center text-center gap-4">
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            {t("labels.type", { ns: "common" })}
                        </p>
                        <p className="font-medium">
                            {UNIT_TYPE_LABELS[unit.type]}
                        </p>
                    </div>
                    {unit.rooms != null && (
                        <div className="border border-dashed p-2 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                {t("labels.rooms", { ns: "common" })}
                            </p>
                            <p className="font-medium">
                                {unit.rooms}
                            </p>
                        </div>
                    )}
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            {t("labels.area", { ns: "common" })}
                        </p>
                        <p className="text-sm font-medium">
                            {unit.area.toFixed(1)} {t("units.sqm", { ns: "common" })}
                        </p>
                    </div>
                    <div className="border border-dashed p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            {t("labels.price", { ns: "common" })}
                        </p>
                        <p className="text-sm font-medium">
                            {formatCurrency(unit.price)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}