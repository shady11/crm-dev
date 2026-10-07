import type {UnitDealHistoryEntry} from "@/features/deals/types/deal.types.ts";

export const UnitType = {
    APARTMENT: "APARTMENT",
    COMMERCIAL: "COMMERCIAL",
    PARKING: "PARKING",
    STORAGE: "STORAGE",
} as const;

export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const UNIT_TYPE_VALUES = [
    UnitType.APARTMENT,
    UnitType.COMMERCIAL,
    UnitType.PARKING,
    UnitType.STORAGE,
] as const;

export const UNIT_TYPE_LABEL_KEYS: Record<UnitType, string> = {
    [UnitType.APARTMENT]: "units:type.apartment",
    [UnitType.COMMERCIAL]: "units:type.commercial",
    [UnitType.PARKING]: "units:type.parking",
    [UnitType.STORAGE]: "units:type.storage",
};

export const UnitStatus = {
    AVAILABLE: "AVAILABLE",
    RESERVED: "RESERVED",
    SOLD: "SOLD",
    UNAVAILABLE: "UNAVAILABLE",
} as const;

export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export const UNIT_STATUS_VALUES = [
    UnitStatus.AVAILABLE,
    UnitStatus.RESERVED,
    UnitStatus.SOLD,
    UnitStatus.UNAVAILABLE,
] as const;

export const UNIT_STATUS_LABEL_KEYS: Record<UnitStatus, string> = {
    [UnitStatus.AVAILABLE]: "units:status.available",
    [UnitStatus.RESERVED]: "units:status.reserved",
    [UnitStatus.SOLD]: "units:status.sold",
    [UnitStatus.UNAVAILABLE]: "units:status.unavailable",
};

// Kerege brandbook «Статусные» colours. Each class carries its own text
// colour, so callers must not add text-white. AVAILABLE has no fill: «free»
// is the default state, not a status. Status colour never carries meaning on
// its own — always render it next to the status label.
export const UNIT_STATUS_CLASSES: Record<UnitStatus, string> = {
    [UnitStatus.AVAILABLE]: "bg-unit-free text-unit-free-foreground border border-unit-free-border",
    [UnitStatus.RESERVED]: "bg-unit-booked text-unit-booked-foreground border border-transparent",
    [UnitStatus.SOLD]: "bg-unit-sold text-unit-sold-foreground border border-transparent",
    [UnitStatus.UNAVAILABLE]: "bg-unit-unavailable text-unit-unavailable-foreground border border-transparent",
};

// Small legend/filter dots: the fills above are too pale (light) or too dark
// (dark theme) to read at dot size, so dots use each status's strong colour.
export const UNIT_STATUS_DOT_CLASSES: Record<UnitStatus, string> = {
    [UnitStatus.AVAILABLE]: "bg-unit-free-border",
    [UnitStatus.RESERVED]: "bg-unit-booked-foreground",
    [UnitStatus.SOLD]: "bg-unit-sold-foreground",
    [UnitStatus.UNAVAILABLE]: "bg-unit-unavailable-foreground",
};

export function isUnitType(type?: string | null): type is UnitType {
    const normalizedType = type?.trim().toUpperCase();

    return UNIT_TYPE_VALUES.some((value) => value === normalizedType);
}

export function normalizeUnitType(type?: string | null): UnitType {
    const normalizedType = type?.trim().toUpperCase();

    return isUnitType(normalizedType)
        ? normalizedType
        : UnitType.APARTMENT;
}

export function isUnitStatus(status?: string | null): status is UnitStatus {
    const normalizedStatus = status?.trim().toUpperCase();

    return UNIT_STATUS_VALUES.some((value) => value === normalizedStatus);
}

export function normalizeUnitStatus(status?: string | null): UnitStatus {
    const normalizedStatus = status?.trim().toUpperCase();

    return isUnitStatus(normalizedStatus)
        ? normalizedStatus
        : UnitStatus.AVAILABLE;
}

export type Unit = {
    id: string;
    number: string;

    type: UnitType;
    status: UnitStatus;

    rooms: number | null;

    area: string;
    price: string;

    floorId: string;

    floor?: {
        id: string;
        number: number;
    };
    block?: {
        id: string;
        name: string;
    };
    entrance?: {
        id: string;
        name: string;
    };
    project?: {
        id: string;
        name: string;
        address?: string | null;
        status?: string;
    };

    deals?: UnitDealHistoryEntry[];
};
