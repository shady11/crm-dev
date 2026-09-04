import {useNavigate} from "react-router-dom";
import {BriefcaseIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DEAL_STATUS_LABEL_KEYS, DEAL_STATUS_VISUALS} from "@/features/deals/types/deal.types";
import type {Deal} from "@/features/deals/api/deals.api";
import {formatCreatedAt, initials} from "@/features/deals/utils/format.ts";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface DealsTableProps {
    deals: Deal[];
    isLoading: boolean;
}

export function DealsTable({ deals, isLoading }: DealsTableProps) {
    const { t } = useTranslation("deals");
    const { formatCurrency } = useCompanyFormatters();

    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-secondary">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (deals.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <BriefcaseIcon strokeWidth={1.25} />
                    </EmptyMedia>
                    <EmptyTitle>No deals found</EmptyTitle>
                    <EmptyDescription>Try adjusting your filters or search.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="rounded-lg border border-secondary">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">Deal #</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sale price</TableHead>
                        <TableHead className="pr-4">Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deals.map((deal) => {
                        const visual = DEAL_STATUS_VISUALS[deal.status];
                        const created = formatCreatedAt(deal.createdAt);

                        return (
                            <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigate(`/deals/${deal.id}`)}>
                                <TableCell className="font-medium pl-4">{deal.dealNumber}</TableCell>
                                <TableCell>
                                    <p className="font-medium">№{deal.unit.number}</p>
                                    <p className="text-xs text-muted-foreground">{deal.project.name}</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-9">
                                            <AvatarFallback>{initials(deal.client.fullName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{deal.client.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{deal.client.phone}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{deal.manager?.fullName ?? "—"}</TableCell>
                                <TableCell>
                                    <Badge className={`${visual?.bg} text-white`}>
                                        {t(DEAL_STATUS_LABEL_KEYS[deal.status])}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatCurrency(deal.salePrice)}</TableCell>
                                <TableCell className="pr-4">
                                    <p>{created.date}</p>
                                    <p className="text-xs text-muted-foreground">{created.time}</p>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}