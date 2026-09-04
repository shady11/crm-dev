import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {
    type Unit,
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABEL_KEYS,
    UNIT_TYPE_LABEL_KEYS
} from "@/features/units/types/unit.types.ts";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {Badge} from "@/components/ui/badge.tsx";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface UnitOverviewProps {
    unit: Unit;
    floor: Floor;
}

export const UnitOverview = ({
                                 unit,
                                 floor,
                             }: UnitOverviewProps) => {
    const { t } = useTranslation("units");
    const { formatCurrency, formatPricePerSqm } = useCompanyFormatters();

    const pricePerSqM =
        parseFloat(unit.area) > 0
            ? Math.round(parseFloat(unit.price) / parseFloat(unit.area))
            : 0;

    return (
        <div className="border border-secondary rounded-lg px-4 py-2">
            <DataList className="divide-y">
                <DataListItem>
                    <DataListItemLabel>{t("overview.numberLabel")}</DataListItemLabel>
                    <DataListItemValue>{unit.number}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("common:labels.floor")}</DataListItemLabel>
                    <DataListItemValue>{floor.number}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("common:labels.status")}</DataListItemLabel>
                    <DataListItemValue>
                        <Badge className={`${UNIT_STATUS_CLASSES[unit.status]} text-white`}>
                            {t(UNIT_STATUS_LABEL_KEYS[unit.status])}
                        </Badge>
                    </DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("common:labels.type")}</DataListItemLabel>
                    <DataListItemValue>{t(UNIT_TYPE_LABEL_KEYS[unit.type])}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("common:labels.rooms")}</DataListItemLabel>
                    <DataListItemValue>{unit.rooms}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("common:labels.area")}</DataListItemLabel>
                    <DataListItemValue>{parseFloat(unit.area).toFixed(1)} m²</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.pricePerSqmLabel")}</DataListItemLabel>
                    <DataListItemValue>{formatPricePerSqm(pricePerSqM)}</DataListItemValue>
                </DataListItem>
                <DataListItem>
                    <DataListItemLabel>{t("overview.listPriceLabel")}</DataListItemLabel>
                    <DataListItemValue>
                        <h4 className="text-lg font-medium">
                            {formatCurrency(parseFloat(unit.price))}
                        </h4>
                    </DataListItemValue>
                </DataListItem>
            </DataList>
        </div>
    );
}