import {useState} from "react";
import {keepPreviousData, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {isAxiosError} from "axios";
import {TagIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader} from "@/components/ui/dialog";
import {Field, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "@/components/ui/toast.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {DealsPagination} from "@/features/deals/components/deals-pagination.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {
    approveUnitPriceRequest,
    getUnitPriceRequests,
    priceChangePercent,
    rejectUnitPriceRequest,
    type UnitPriceRequest,
} from "@/features/units/api/unit-price-requests.api.ts";

type View = "PENDING" | "ALL";

/**
 * SH-2: every list-price change. A Company Admin (units.approve_price)
 * decides the pending ones here and sees the whole history; someone who can
 * only ask (units.edit_price) sees their own requests and how they went.
 */
export function PriceChangesPage() {
    const {t} = useTranslation("units");
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const {formatCurrency, formatDate} = useCompanyFormatters();
    const canApprove = hasPermission(user, "units.approve_price");

    const [view, setView] = useState<View>("PENDING");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [rejecting, setRejecting] = useState<UnitPriceRequest | null>(null);
    const [reason, setReason] = useState("");

    const requests = useQuery({
        queryKey: ["unit-price-requests", {view, page, limit}],
        queryFn: () => getUnitPriceRequests({status: view === "PENDING" ? "PENDING" : undefined, page, limit}),
        placeholderData: keepPreviousData,
    });

    const refresh = async () => {
        await queryClient.invalidateQueries({queryKey: ["unit-price-requests"]});
        await queryClient.invalidateQueries({queryKey: ["dashboard"]});
        await queryClient.invalidateQueries({queryKey: ["project-chessboard"]});
        await queryClient.invalidateQueries({queryKey: ["project-tree"]});
        await queryClient.invalidateQueries({queryKey: ["units"]});
    };
    const onDecisionError = (error: unknown) => {
        const conflict = isAxiosError(error) && error.response?.status === 409;
        void refresh();
        toast.error({title: conflict ? t("priceChanges.alreadyDecided") : t("priceChanges.decisionError")});
    };

    const approve = useMutation({
        mutationFn: (id: string) => approveUnitPriceRequest(id),
        onSuccess: async () => {
            await refresh();
            toast.success({title: t("priceChanges.approved")});
        },
        onError: onDecisionError,
    });
    const reject = useMutation({
        mutationFn: ({id, reason}: {id: string; reason: string}) => rejectUnitPriceRequest(id, reason),
        onSuccess: async () => {
            await refresh();
            setRejecting(null);
            setReason("");
            toast.success({title: t("priceChanges.rejected")});
        },
        onError: onDecisionError,
    });

    const items = requests.data?.items ?? [];

    const change = (r: UnitPriceRequest) => {
        const pct = priceChangePercent(r.currentPrice, r.requestedPrice);
        return (
            <>
                <p className="tabular-nums">
                    <span className="text-muted-foreground line-through">{formatCurrency(r.currentPrice)}</span>
                    {" → "}
                    <span className="font-medium">{formatCurrency(r.requestedPrice)}</span>
                </p>
                <p className={`text-xs tabular-nums ${pct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {pct > 0 ? "+" : ""}{pct}%
                </p>
            </>
        );
    };

    const status = (r: UnitPriceRequest) => (
        <div className="space-y-0.5">
            <Badge variant={r.status === "REJECTED" ? "destructive" : r.status === "PENDING" ? "outline" : "secondary"}>
                {t(`priceChanges.status.${r.status}`)}
            </Badge>
            {r.status !== "PENDING" && r.decidedBy && r.decidedBy.id !== r.requestedBy?.id ? (
                <p className="text-xs text-muted-foreground">{t("priceChanges.decidedBy", {name: r.decidedBy.fullName})}</p>
            ) : null}
            {r.rejectionReason ? <p className="text-xs text-muted-foreground">{r.rejectionReason}</p> : null}
        </div>
    );

    const actions = (r: UnitPriceRequest) => canApprove && r.status === "PENDING" ? (
        <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" disabled={approve.isPending || reject.isPending} onClick={() => setRejecting(r)}>
                {t("priceChanges.reject")}
            </Button>
            <Button
                size="sm"
                disabled={approve.isPending || reject.isPending}
                isLoading={approve.isPending && approve.variables === r.id}
                onClick={() => approve.mutate(r.id)}
            >
                {t("priceChanges.approve")}
            </Button>
        </div>
    ) : null;

    const unitCell = (r: UnitPriceRequest) => (
        <>
            <p className="font-medium">№{r.unit.number}</p>
            <p className="text-xs text-muted-foreground">{r.unit.project.name} · {r.unit.block.name}</p>
        </>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("priceChanges.title")}</h2>
                <p className="text-sm text-muted-foreground">
                    {canApprove ? t("priceChanges.descriptionApprover") : t("priceChanges.descriptionRequester")}
                </p>
            </div>

            <Tabs value={view} onValueChange={({value}) => { setView(value as View); setPage(1); }}>
                <TabsList>
                    <TabsTrigger value="PENDING">{t("priceChanges.tabs.pending")}</TabsTrigger>
                    <TabsTrigger value="ALL">{t("priceChanges.tabs.all")}</TabsTrigger>
                </TabsList>
            </Tabs>

            <DataTable
                isLoading={requests.isLoading}
                isEmpty={items.length === 0}
                emptyIcon={<TagIcon strokeWidth={1.25} />}
                emptyTitle={view === "PENDING" ? t("priceChanges.emptyPendingTitle") : t("priceChanges.emptyTitle")}
                emptyDescription={view === "PENDING" ? t("priceChanges.emptyPendingDescription") : t("priceChanges.emptyDescription")}
                cards={items.map((r) => (
                    <div key={r.id} className="space-y-3 rounded-lg border border-secondary p-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">{unitCell(r)}</div>
                            <div className="shrink-0 text-right">{change(r)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {r.requestedBy?.fullName ?? "—"} · {formatDate(r.createdAt)}
                        </p>
                        <div className="flex items-end justify-between gap-3">
                            {status(r)}
                            {actions(r)}
                        </div>
                    </div>
                ))}
            >
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">{t("priceChanges.table.unit")}</TableHead>
                        <TableHead>{t("priceChanges.table.change")}</TableHead>
                        <TableHead>{t("priceChanges.table.requestedBy")}</TableHead>
                        <TableHead>{t("priceChanges.table.status")}</TableHead>
                        <TableHead className="pr-4"><span className="sr-only">{t("priceChanges.table.actions")}</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell className="pl-4">{unitCell(r)}</TableCell>
                            <TableCell>{change(r)}</TableCell>
                            <TableCell>
                                <p>{r.requestedBy?.fullName ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                            </TableCell>
                            <TableCell>{status(r)}</TableCell>
                            <TableCell className="pr-4">{actions(r)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </DataTable>

            <DealsPagination
                page={page}
                limit={limit}
                total={requests.data?.meta.total ?? 0}
                onPageChange={setPage}
                onLimitChange={(value) => { setLimit(value); setPage(1); }}
            />

            <Dialog open={!!rejecting} onOpenChange={({open}) => { if (!open) { setRejecting(null); setReason(""); } }}>
                <DialogContent size="sm">
                    <DialogHeader
                        title={t("priceChanges.rejectDialogTitle", {unit: rejecting?.unit.number ?? ""})}
                        description={t("priceChanges.rejectDialogDescription")}
                    />
                    <DialogBody>
                        <FieldSet className="pt-4">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>{t("priceChanges.rejectReason")}</FieldLabel>
                                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => { setRejecting(null); setReason(""); }}>
                            {t("priceChanges.back")}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={reason.trim().length < 2 || reject.isPending}
                            isLoading={reject.isPending}
                            onClick={() => rejecting && reject.mutate({id: rejecting.id, reason: reason.trim()})}
                        >
                            {t("priceChanges.reject")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
