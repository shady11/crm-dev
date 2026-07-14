import {Badge} from "@/components/ui/badge.tsx";
import {type Project, PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABELS} from "@/features/projects/types/project.types.ts";
import {Building2} from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog.tsx";
import {useState} from "react";
import {Item, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item";
import {Separator} from "@/components/ui/separator.tsx";

type Props = {
    project: Project;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
    isDeleting?: boolean;
};

export function ProjectCard({project, onDelete, isDeleting}: Props) {
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            <Item variant="default" className="bg-card shadow-sm p-4">
                <a href={`/projects/${project.id}`} className="flex w-full flex-col gap-4">
                    <div className="flex w-full items-center gap-4">
                        <ItemMedia variant="icon">
                            <Building2 className="size-10" strokeWidth={1} />
                        </ItemMedia>
                        <ItemContent className="gap-0">
                            <ItemTitle className="text-lg">{project.name}</ItemTitle>
                            <ItemDescription className="text-xs">{project.address}</ItemDescription>
                        </ItemContent>
                        <Badge variant="default"
                               className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                            {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                    </div>
                    <Separator/>
                    <div className="flex items-center gap-4 text-sm *:[div]:space-y-1">
                        <div>
                            <p className="font-medium leading-none">Blocks</p>
                            <p className="text-muted-foreground">{project._count.blocks}</p>
                        </div>
                        <Separator orientation="vertical" />
                        <div>
                            <p className="font-medium leading-none">Units</p>
                            <p className="text-muted-foreground">{project._count.units}</p>
                        </div>
                    </div>
                </a>
            </Item>
            <AlertDialog
                open={deleteOpen}
                onOpenChange={({ open }) => setDeleteOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete project?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{project.name}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => {
                                onDelete?.(project);
                                setDeleteOpen(false);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
