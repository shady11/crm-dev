import {CheckCircle2Icon} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {DEAL_STATUS_LABELS, DEAL_STATUS_VISUALS, type DealStatus} from "@/features/deals/types/deal.types";

interface DealStatusCardProps {
    status: DealStatus;
    count: number;
}

export function DealStatusCard({ status, count }: DealStatusCardProps) {
    const visual = DEAL_STATUS_VISUALS[status];
    const Icon = visual?.icon ?? CheckCircle2Icon;

    return (
        <Card className="border border-secondary shadow-none">
            <CardContent className="flex items-center gap-3">
                <div className={`rounded-lg p-2 text-white ${visual?.bg}`}>
                    <Icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                    <h3 className="font-medium">{DEAL_STATUS_LABELS[status]}</h3>
                    <p className="text-sm text-muted-foreground">
                        {count} deal{count !== 1 ? "s" : ""}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}