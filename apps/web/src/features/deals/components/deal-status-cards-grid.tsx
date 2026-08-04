import {DealStatus} from "@/features/deals/types/deal.types";
import {DealStatusCard} from "./deal-status-card";

interface DealStatusCardsGridProps {
    countsByStatus: Map<DealStatus, number>;
}

export function DealStatusCardsGrid({ countsByStatus }: DealStatusCardsGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Object.values(DealStatus).map((status) => (
                <DealStatusCard key={status} status={status} count={countsByStatus.get(status) ?? 0} />
            ))}
        </div>
    );
}