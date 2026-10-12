import {DealStatus} from "@/features/deals/types/deal.types";
import {DealStatusCard} from "./deal-status-card";

interface DealStatusCardsGridProps {
    countsByStatus: Map<DealStatus, number>;
    hrefFor?(status: DealStatus): string;
    selectedStatus?: DealStatus;
    onSelect?(status: DealStatus): void;
}

export function DealStatusCardsGrid({ countsByStatus, hrefFor, selectedStatus, onSelect }: DealStatusCardsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Object.values(DealStatus).map((status) => (
                <DealStatusCard
                    key={status}
                    status={status}
                    count={countsByStatus.get(status) ?? 0}
                    to={hrefFor?.(status)}
                    onSelect={onSelect ? () => onSelect(status) : undefined}
                    selected={selectedStatus === status}
                />
            ))}
        </div>
    );
}