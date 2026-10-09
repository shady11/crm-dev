import {DealStatus} from "@/features/deals/types/deal.types";
import {DealStatusCard} from "./deal-status-card";

interface DealStatusCardsGridProps {
    countsByStatus: Map<DealStatus, number>;
}

export function DealStatusCardsGrid({ countsByStatus }: DealStatusCardsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Object.values(DealStatus).map((status) => (
                <DealStatusCard key={status} status={status} count={countsByStatus.get(status) ?? 0} />
            ))}
        </div>
    );
}