import {createListCollection} from "@ark-ui/react";
import {ChevronsUpDown, XIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup} from "@/components/ui/field";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABEL_KEYS,
    UNIT_STATUS_VALUES,
    UNIT_TYPE_LABEL_KEYS,
    UNIT_TYPE_VALUES,
    type UnitStatus,
    type UnitType,
} from "@/features/units/types/unit.types";
import {Status} from "@/components/ui/status.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {useTranslation} from "react-i18next";
import {useMemo} from "react";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

export interface Filters {
    status: UnitStatus | "all";
    type: UnitType | "all";
    rooms: string;
    areaMin: string;
    areaMax: string;
    priceMin: string;
    priceMax: string;
}

interface ChessboardFiltersProps {
    filters: Filters;
    hasActiveFilters: boolean;
    totalUnits: number;
    onFiltersChange(filters: Filters): void;
    onClearFilters(): void;
}

/* Presets Data Definitions */
const ROOM_PRESETS = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4+", value: "4" },
];



export function ChessboardFilters({
                                      filters,
                                      hasActiveFilters,
                                      totalUnits,
                                      onFiltersChange,
                                      onClearFilters,
                                  }: ChessboardFiltersProps) {

    const { t } = useTranslation("units");
    const { formatCurrency } = useCompanyFormatters();

    const AREA_PRESETS = useMemo(() => [
        { label: t("filters.areaUnder", { value: "50" }), min: "", max: "50" },
        { label: t("filters.areaRange", { min: "50", max: "80" }), min: "50", max: "80" },
        { label: t("filters.areaRange", { min: "80", max: "120" }), min: "80", max: "120" },
        { label: t("filters.areaOver", { value: "120" }), min: "120", max: "" },
    ], [t]);

    const PRICE_PRESETS = useMemo(() => [
        { label: t("filters.pricePresetUnder", { value: "$50k" }), min: "", max: "50000" },
        { label: t("filters.pricePresetRange", { min: "$50k", max: "$100k" }), min: "50000", max: "100000" },
        { label: t("filters.pricePresetRange", { min: "$100k", max: "$200k" }), min: "100000", max: "200000" },
        { label: t("filters.pricePresetOver", { value: "$200k" }), min: "200000", max: "" },
    ], [t]);
    
    const getRoomsSummary = () => {
        if (!filters.rooms) return t("common:labels.rooms");
        return t("filters.roomsSummary", { count: Number(filters.rooms) });
    };

    const getAreaSummary = () => {
        if (!filters.areaMin && !filters.areaMax) return t("common:labels.area");
        if (filters.areaMin && filters.areaMax) return t("filters.areaRange", { min: filters.areaMin, max: filters.areaMax });
        if (filters.areaMin) return t("filters.areaOver", { value: filters.areaMin });
        return t("filters.areaUnder", { value: filters.areaMax });
    };

    const getPriceSummary = () => {
        if (!filters.priceMin && !filters.priceMax) return t("common:labels.price");
        if (filters.priceMin && filters.priceMax) return t("filters.priceRange", { min: formatCurrency(Number(filters.priceMin)), max: formatCurrency(Number(filters.priceMax)) });
        if (filters.priceMin) return t("filters.priceOver", { value: formatCurrency(Number(filters.priceMin)) });
        return t("filters.priceUnder", { value: formatCurrency(Number(filters.priceMax)) });
    };

    const typeCollection = createListCollection({
        items: [
            ...UNIT_TYPE_VALUES.map((type) => ({
                label: t(UNIT_TYPE_LABEL_KEYS[type]),
                value: type,
            })),
        ],
    });

    const statusCollection = createListCollection({
        items: [
            ...UNIT_STATUS_VALUES.map((status) => ({
                label: t(UNIT_STATUS_LABEL_KEYS[status]),
                value: status,
            })),
        ],
    });

    return (
        <div className="flex items-center">
            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {/* Status Select */}
                    <Field>
                        <Select
                            collection={statusCollection}
                            value={[filters.status]}
                            onValueChange={(details) =>
                                onFiltersChange({
                                    ...filters,
                                    status: details.value[0] as UnitStatus | "all",
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("common:labels.status")} />
                            </SelectTrigger>
                            <SelectContent>
                                {statusCollection.items.map((status) => (
                                    <SelectItem key={status.value} item={status}>
                                        <Status
                                            size="sm"
                                            variant="default"
                                            className={UNIT_STATUS_CLASSES[status.value]}
                                        />
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    {/* Type Select */}
                    <Field>
                        <Select
                            collection={typeCollection}
                            value={[filters.type]}
                            onValueChange={(details) =>
                                onFiltersChange({
                                    ...filters,
                                    type: details.value[0] as UnitType | "all",
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("common:labels.type")} />
                            </SelectTrigger>
                            <SelectContent>
                                {typeCollection.items.map((type) => (
                                    <SelectItem key={type.value} item={type}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    {/* Rooms Popover Filter */}
                    <Field>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between text-left font-normal"
                                >
                                    <span className="truncate">{getRoomsSummary()}</span>
                                    <ChevronsUpDown className="opacity-60" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 space-y-3 p-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">{t("filters.roomsCountLabel")}</span>
                                    <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                        {ROOM_PRESETS.map((preset) => {
                                            const isActive = filters.rooms === preset.value;
                                            return (
                                                <Button
                                                    key={preset.label}
                                                    variant={isActive ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() =>
                                                        onFiltersChange({
                                                            ...filters,
                                                            rooms: isActive ? "" : preset.value,
                                                        })
                                                    }
                                                >
                                                    {preset.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Field>

                    {/* Area Popover Filter */}
                    <Field>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between text-left font-normal"
                                >
                                    <span className="truncate">{getAreaSummary()}</span>
                                    <ChevronsUpDown className="opacity-60" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 space-y-3 p-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">{t("filters.rangeLabel")}</span>
                                    <div className="flex items-center gap-2">
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder={t("filters.fromPlaceholder")}
                                                value={filters.areaMin}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        ...filters,
                                                        areaMin: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputGroupAddon className="gap-0" align="inline-end">
                                                m<sup>2</sup>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder={t("filters.toPlaceholder")}
                                                value={filters.areaMax}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        ...filters,
                                                        areaMax: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputGroupAddon className="gap-0" align="inline-end">
                                                m<sup>2</sup>
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">{t("filters.presetsLabel")}</span>
                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                        {AREA_PRESETS.map((preset) => {
                                            const isActive =
                                                filters.areaMin === preset.min &&
                                                filters.areaMax === preset.max;
                                            return (
                                                <Button
                                                    key={preset.label}
                                                    type="button"
                                                    variant={isActive ? "default" : "outline"}
                                                    size="xs"
                                                    onClick={() =>
                                                        onFiltersChange({
                                                            ...filters,
                                                            areaMin: isActive ? "" : preset.min,
                                                            areaMax: isActive ? "" : preset.max,
                                                        })
                                                    }
                                                >
                                                    {preset.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Field>

                    {/* Price Popover Filter */}
                    <Field>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between text-left font-normal"
                                >
                                    <span className="truncate">{getPriceSummary()}</span>
                                    <ChevronsUpDown className="opacity-60" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 space-y-3 p-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">{t("filters.rangeLabel")}</span>
                                    <div className="flex items-center gap-2">
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder={t("filters.fromPlaceholder")}
                                                value={filters.priceMin}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        ...filters,
                                                        priceMin: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputGroupAddon className="gap-0" align="inline-start">
                                                $
                                            </InputGroupAddon>
                                        </InputGroup>
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder={t("filters.toPlaceholder")}
                                                value={filters.priceMax}
                                                onChange={(e) =>
                                                    onFiltersChange({
                                                        ...filters,
                                                        priceMax: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputGroupAddon className="gap-0" align="inline-start">
                                                $
                                            </InputGroupAddon>
                                        </InputGroup>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">{t("filters.presetsLabel")}</span>
                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                        {PRICE_PRESETS.map((preset) => {
                                            const isActive =
                                                filters.priceMin === preset.min &&
                                                filters.priceMax === preset.max;
                                            return (
                                                <Button
                                                    key={preset.label}
                                                    type="button"
                                                    variant={isActive ? "default" : "outline"}
                                                    size="xs"
                                                    onClick={() =>
                                                        onFiltersChange({
                                                            ...filters,
                                                            priceMin: isActive ? "" : preset.min,
                                                            priceMax: isActive ? "" : preset.max,
                                                        })
                                                    }
                                                >
                                                    {preset.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Field>

                    {hasActiveFilters && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {t("filters.unitsFound", { count: totalUnits })}
                            </span>
                            <Button variant="ghost" size="sm" onClick={onClearFilters}>
                                <XIcon className="size-3" /> {t("filters.clearAll")}</Button>
                        </div>
                    )}
                </div>
            </FieldGroup>
        </div>
    );
}