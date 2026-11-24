import type {ReactNode} from "react";
import {useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {Building2, CalendarIcon, CheckCircle2Icon, DoorOpenIcon, Loader2, MapPinIcon, TimerIcon} from "lucide-react";
import {useTranslation} from "react-i18next";

import {getProject, getProjectChessboard} from "../api/projects.api";
import {Badge} from "@/components/ui/badge.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {KpiCard} from "@/features/dashboard/components/kpi-card.tsx";
import {PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABEL_KEYS} from "@/features/projects/types/project.types.ts";
import {BLOCK_SALES_STATUS_LABEL_KEYS, completionQuarter} from "@/features/blocks/types/block-sales.ts";
import {UNIT_STATUS_CLASSES, UNIT_STATUS_LABEL_KEYS, UnitStatus} from "@/features/units/types/unit.types.ts";
import {formatDay} from "@/utils/date-formatter.ts";

/** Counts every unit in the chessboard response by its status. */
function countUnitsByStatus(data: unknown): Record<string, number> {
    const counts: Record<string, number> = {};
    const walk = (node: unknown) => {
        if (Array.isArray(node)) {
            node.forEach(walk);
        } else if (node && typeof node === "object") {
            const record = node as Record<string, unknown>;
            if (typeof record.status === "string" && "number" in record && ("price" in record || "area" in record)) {
                counts[record.status] = (counts[record.status] ?? 0) + 1;
            }
            Object.values(record).forEach(walk);
        }
    };
    walk(data);
    return counts;
}

/**
 * The project at a glance: how many units are free, reserved and sold, its
 * own details, and its blocks. Sales figures live in the Analytics tab.
 * Unit counts come from the chessboard, which every role that can open a
 * project can read.
 */
export function ProjectOverview() {
    const {t} = useTranslation(["projects", "blocks", "units", "common"]);
    const {projectId} = useParams();

    const projectQuery = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => getProject(projectId!),
        enabled: !!projectId,
    });
    const chessboardQuery = useQuery({
        queryKey: ["project-chessboard", projectId],
        queryFn: () => getProjectChessboard(projectId!),
        enabled: !!projectId,
    });

    if (projectQuery.isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500"/>
            </div>
        );
    }

    if (!projectQuery.data) {
        return <div>{t("overview.notFound")}</div>;
    }

    const project = projectQuery.data;
    const byStatus = countUnitsByStatus(chessboardQuery.data);
    const count = (status: UnitStatus) => String(chessboardQuery.data ? byStatus[status] ?? 0 : "—");

    return (
        <div className="space-y-6">
            {/* Units by status, in the same colours as the chessboard. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard icon={DoorOpenIcon} accent="bg-primary" label={t("overview.unitsTotal")} value={String(project._count?.units ?? 0)} />
                <KpiCard icon={CheckCircle2Icon} accent={UNIT_STATUS_CLASSES[UnitStatus.AVAILABLE]} label={t(UNIT_STATUS_LABEL_KEYS[UnitStatus.AVAILABLE])} value={count(UnitStatus.AVAILABLE)} />
                <KpiCard icon={TimerIcon} accent={UNIT_STATUS_CLASSES[UnitStatus.RESERVED]} label={t(UNIT_STATUS_LABEL_KEYS[UnitStatus.RESERVED])} value={count(UnitStatus.RESERVED)} />
                <KpiCard icon={Building2} accent={UNIT_STATUS_CLASSES[UnitStatus.SOLD]} label={t(UNIT_STATUS_LABEL_KEYS[UnitStatus.SOLD])} value={count(UnitStatus.SOLD)} />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-2">
                <Card className="gap-0 py-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm font-semibold">{t("overview.details")}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <dl className="divide-y text-sm">
                            <DetailRow label={t("common:labels.status")}>
                                <Badge className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                                    {t(PROJECT_STATUS_LABEL_KEYS[project.status])}
                                </Badge>
                            </DetailRow>
                            <DetailRow label={t("form.addressLabel")}>
                                {project.address ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                        {project.address}
                                    </span>
                                ) : "—"}
                            </DetailRow>
                            <DetailRow label={t("form.handoverDateLabel")}>
                                {project.handoverDate ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                        {formatDay(project.handoverDate, {utc: true})}
                                    </span>
                                ) : "—"}
                            </DetailRow>
                            <DetailRow label={t("common:labels.createdAt")}>{formatDay(project.createdAt)}</DetailRow>
                        </dl>
                    </CardContent>
                </Card>

                <Card className="gap-0 py-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm font-semibold">
                            {t("counts.blocksLabel")} ({project.blocks?.length ?? 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        {(project.blocks?.length ?? 0) === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("overview.noBlocks")}</p>
                        ) : (
                            <div className="divide-y">
                                {project.blocks.map((block) => {
                                    const quarter = completionQuarter(t, block.completionDate);
                                    return (
                                        <div key={block.id} className="flex items-center justify-between gap-3 py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="icon-tile flex size-8 shrink-0 items-center justify-center bg-primary">
                                                    <Building2 className="size-4" strokeWidth={1.75} />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{t("blocks:item.titleWithName", {name: block.name})}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {[
                                                            t("blocks:item.entrances", {count: block._count?.entrances ?? 0}),
                                                            t("chessboard.floors", {count: block._count?.floors ?? 0}),
                                                            t("overview.units", {count: block._count?.units ?? 0}),
                                                            quarter && t("blocks:completion", {quarter}),
                                                        ].filter(Boolean).join(" · ")}
                                                    </p>
                                                </div>
                                            </div>
                                            {block.salesStatus && (
                                                <Badge variant="secondary" className="shrink-0">
                                                    {t(BLOCK_SALES_STATUS_LABEL_KEYS[block.salesStatus])}
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DetailRow({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium">{children}</dd>
        </div>
    );
}
