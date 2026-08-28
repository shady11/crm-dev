import {CalendarCheckIcon, CalendarIcon, CheckCircle2Icon, XCircleIcon} from "lucide-react";

export const DealStatus = {
    RESERVED: "RESERVED",
    CONTRACT_SIGNED: "CONTRACT_SIGNED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
} as const;

export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const ACTIVE_DEAL_STATUSES: DealStatus[] = [
    DealStatus.RESERVED,
    DealStatus.CONTRACT_SIGNED,
    DealStatus.ACTIVE,
];

export const DEAL_STATUS_LABEL_KEYS: Record<DealStatus, string> = {
    [DealStatus.RESERVED]: "deals:status.reserved",
    [DealStatus.CONTRACT_SIGNED]: "deals:status.contractSigned",
    [DealStatus.ACTIVE]: "deals:status.active",
    [DealStatus.COMPLETED]: "deals:status.completed",
    [DealStatus.CANCELLED]: "deals:status.cancelled",
    [DealStatus.EXPIRED]: "deals:status.expired",
};

export const DEAL_STATUS_VISUALS: Record<
    string,
    { icon: typeof CheckCircle2Icon; heading: string; bg: string}
> = {
    RESERVED: {
        icon: CalendarCheckIcon,
        heading: "Reservation",
        bg: "bg-amber-400",
    },
    CONTRACT_SIGNED: {
        icon: CalendarIcon,
        heading: "Contract signed",
        bg: "bg-blue-400",
    },
    ACTIVE: {
        icon: CheckCircle2Icon,
        heading: "Sale in progress",
        bg: "bg-emerald-400",
    },
    COMPLETED: {
        icon: CheckCircle2Icon,
        heading: "Sold",
        bg: "bg-emerald-400",
    },
    CANCELLED: {
        icon: XCircleIcon,
        heading: "Cancelled",
        bg: "bg-gray-400",
    },
    EXPIRED: {
        icon: XCircleIcon,
        heading: "Expired",
        bg: "bg-gray-400",
    },
};

/**
 * Slim deal shape as it's embedded on a Unit (e.g. from the project-tree endpoint).
 * Not the full Deal — see deals.api.ts's `Deal` type for the full shape.
 */
export type UnitDeal = {
    id: string;
    dealNumber: string;
    status: DealStatus;
    reservedAt: string | null;
    reservationExpiresAt: string | null;
    salePrice: string;
    client: {
        id: string;
        fullName: string;
        phone: string;
    };
    manager: {
        id: string;
        fullName: string;
    } | null;
};

export type UnitDealHistoryEntry = UnitDeal & {
    financingType: "CASH" | "INSTALLMENT" | "MORTGAGE" | null;
    discountAmount: string | null;
    discountPercent: string | null;
    deposit: string | null;
    contractNumber: string | null;
    contractDate: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
    note: string | null;
    createdAt: string;
};

/**
 * Returns the active deal off any object carrying a `deals` array
 * (e.g. a Unit from the project-tree endpoint).
 */
export function getActiveDeal(entity: { deals?: UnitDeal[] }): UnitDeal | undefined {
    return entity.deals?.[0];
}