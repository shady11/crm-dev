import {Outlet, useNavigate, useParams} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {PROJECT_STATUS_BADGE_CLASSES, PROJECT_STATUS_LABELS} from "@/features/projects/types/project.types.ts";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft, Loader2, Pen, Trash2} from "lucide-react";
import {useState} from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog.tsx";
import {ProjectForm} from "@/features/projects/components/project-form.tsx";
import {ProjectTabs} from "@/features/projects/components/project-tabs.tsx";
import {deleteProject, getProject, updateProject} from "@/features/projects/api/projects.api.ts";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {toast} from "@/components/ui/toast.tsx";

export function ProjectPage() {
    const {projectId} = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [open, setOpen] = useState(false);

    const projectQuery = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => getProject(projectId!),
        enabled: !!projectId,
    });

    const updateMutation = useMutation({
        mutationFn: (payload: any) => updateProject(projectId!, payload),
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({queryKey: ["projects"]});
            await queryClient.invalidateQueries({queryKey: ["project", projectId]});

            toast.success({
                title: "Successfully updated",
                description: `Project "${variables.name}" has been updated.`,
            });

            setOpen(false);
        },

        onError: () => {
            toast.error({
                title: "Failed to update project",
                description: "Please try again.",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteProject(projectId!),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["projects"]});
            navigate("/projects");
        },
    });

    if (projectQuery.isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500"/>
            </div>
        );
    }

    if (!projectQuery.data) {
        return <div className="p-6 text-center font-medium">Project not found</div>;
    }

    const project = projectQuery.data;
    const isSubmitting = updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-medium">{project.name}</h1>
                    <Badge variant="default" className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                        {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => navigate("/projects")}>
                        <ArrowLeft className="size-3"/>
                        Back
                    </Button>

                    <Button onClick={() => setOpen(true)}>
                        <Pen className="size-3"/>
                        Edit
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="size-3"/>
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete "{project.name}" and all of its nested structural
                                    models.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleteMutation.isPending}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate()}
                                >
                                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <ProjectTabs/>

            <Outlet/>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent variant="inset" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Edit project</SheetTitle>
                    </SheetHeader>
                    <ProjectForm
                        key={`edit-project-${project.id}-${open ? "open" : "closed"}`}
                        project={project}
                        errorMessage={
                            updateMutation.isError
                                ? "Project could not be saved. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={isSubmitting}
                        submitLabel="Save changes"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}