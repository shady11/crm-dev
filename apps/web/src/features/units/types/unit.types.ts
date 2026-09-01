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

export const UNIT_STATUS_CLASSES: Record<UnitStatus, string> = {
    [UnitStatus.AVAILABLE]: "bg-emerald-400",
    [UnitStatus.RESERVED]: "bg-amber-400",
    [UnitStatus.SOLD]: "bg-rose-400",
    [UnitStatus.UNAVAILABLE]: "bg-gray-400",
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
    };

    deals?: UnitDealHistoryEntry[];
};
