import {Badge} from "@/components/ui/badge.tsx";
import {
    type Project,
    PROJECT_STATUS_BADGE_CLASSES,
    PROJECT_STATUS_LABEL_KEYS
} from "@/features/projects/types/project.types.ts";
import {Building2, CalendarIcon, MapPinIcon} from "lucide-react";
import {Link} from "react-router-dom";
import {paths} from "@/routes/paths.ts";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog.tsx";
import {useState} from "react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {formatDay} from "@/utils/date-formatter.ts";
import {useTranslation} from "react-i18next";

type Props = {
    project: Project;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
    isDeleting?: boolean;
};

export function ProjectCard({project, onDelete, isDeleting}: Props) {
    const { t } = useTranslation("projects");

    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            {/* Same card language as the rest of the app: a brand tile, the
                name, a status pill, then the counts large. */}
            <Link
                to={paths.projects.detail(project.id)}
                className="group block rounded-[9px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Card className="h-full gap-5 transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_-18px_rgb(35_42_77/0.35)]">
                    <CardContent className="flex flex-col gap-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="icon-tile flex size-10 shrink-0 items-center justify-center bg-primary">
                                    <Building2 className="size-5" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold">{project.name}</p>
                                    {project.address && (
                                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                            <MapPinIcon className="size-3 shrink-0" />
                                            <span className="truncate">{project.address}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Badge className={`shrink-0 ${PROJECT_STATUS_BADGE_CLASSES[project.status]}`}>
                                {t(PROJECT_STATUS_LABEL_KEYS[project.status])}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md bg-muted/60 px-3 py-2.5">
                                <p className="text-xs text-muted-foreground">{t("counts.blocksLabel")}</p>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{project._count?.blocks ?? 0}</p>
                            </div>
                            <div className="rounded-md bg-muted/60 px-3 py-2.5">
                                <p className="text-xs text-muted-foreground">{t("counts.unitsLabel")}</p>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{project._count?.units ?? 0}</p>
                            </div>
                        </div>

                        {project.handoverDate && (
                            <p className="flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
                                <CalendarIcon className="size-3.5 shrink-0" />
                                {t("form.handoverDateLabel")}:
                                <span className="font-medium text-foreground">{formatDay(project.handoverDate)}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
            </Link>
            <AlertDialog
                open={deleteOpen}
                onOpenChange={({ open }) => setDeleteOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("card.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("card.deleteDescription", { name: project.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >{t("common:actions.cancel")}</AlertDialogCancel>

                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => {
                                onDelete?.(project);
                                setDeleteOpen(false);
                            }}
                        >{t("common:actions.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
