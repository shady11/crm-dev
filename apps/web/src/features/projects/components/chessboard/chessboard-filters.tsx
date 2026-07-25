import {createListCollection} from "@ark-ui/react";
import {ChevronsUpDown, XIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup} from "@/components/ui/field";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABELS,
    UNIT_STATUS_VALUES,
    UNIT_TYPE_LABELS,
    UNIT_TYPE_VALUES,
    type UnitStatus,
    type UnitType,
} from "@/features/units/types/unit.types";
import {Status} from "@/components/ui/status.tsx";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";

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

const statusCollection = createListCollection({
    items: [
        ...UNIT_STATUS_VALUES.map((status) => ({
            label: UNIT_STATUS_LABELS[status],
            value: status,
        })),
    ],
});

const typeCollection = createListCollection({
    items: [
        ...UNIT_TYPE_VALUES.map((type) => ({
            label: UNIT_TYPE_LABELS[type],
            value: type,
        })),
    ],
});

/* Presets Data Definitions */
const ROOM_PRESETS = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4+", value: "4" },
];

const AREA_PRESETS = [
    { label: "Under 50 m²", min: "", max: "50" },
    { label: "50 – 80 m²", min: "50", max: "80" },
    { label: "80 – 120 m²", min: "80", max: "120" },
    { label: "Over 120 m²", min: "120", max: "" },
];

const PRICE_PRESETS = [
    { label: "Under $50k", min: "", max: "50000" },
    { label: "$50k – $100k", min: "50000", max: "100000" },
    { label: "$100k – $200k", min: "100000", max: "200000" },
    { label: "Over $200k", min: "200000", max: "" },
];

export function ChessboardFilters({
                                      filters,
                                      hasActiveFilters,
                                      totalUnits,
                                      onFiltersChange,
                                      onClearFilters,
                                  }: ChessboardFiltersProps) {
    const getRoomsSummary = () => {
        if (!filters.rooms) return "Rooms";
        return `${filters.rooms} room${filters.rooms === "1" ? "" : "s"}`;
    };

    const getAreaSummary = () => {
        if (!filters.areaMin && !filters.areaMax) return "Area";
        if (filters.areaMin && filters.areaMax) return `${filters.areaMin}–${filters.areaMax} m²`;
        if (filters.areaMin) return `Over ${filters.areaMin} m²`;
        return `Under ${filters.areaMax} m²`;
    };

    const getPriceSummary = () => {
        if (!filters.priceMin && !filters.priceMax) return "Price";
        if (filters.priceMin && filters.priceMax) return `$${filters.priceMin}–$${filters.priceMax}`;
        if (filters.priceMin) return `Over $${filters.priceMin}`;
        return `Under $${filters.priceMax}`;
    };

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
                                <SelectValue placeholder="Status" />
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
                                <SelectValue placeholder="Type" />
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                      Rooms count
                                    </span>
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Range
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder="From"
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
                                                placeholder="To"
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                      Presets
                                    </span>
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Range
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <InputGroup size="sm">
                                            <InputGroupInput
                                                placeholder="From"
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
                                                placeholder="To"
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Presets
                                    </span>
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
                                {totalUnits} unit{totalUnits !== 1 ? "s" : ""} found
                            </span>
                            <Button variant="ghost" size="sm" onClick={onClearFilters}>
                                <XIcon className="size-3" />
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>
            </FieldGroup>
        </div>
    );
}