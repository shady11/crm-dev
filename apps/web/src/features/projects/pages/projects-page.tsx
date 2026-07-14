import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { ProjectForm } from "@/features/projects/components/project-form";
import {
    PROJECT_STATUS_LABELS,
    PROJECT_STATUS_VALUES,
    type Project,
    type ProjectStatus,
} from "@/features/projects/types/project.types";
import {
    createProject,
    deleteProject,
    getProjects,
    updateProject,
    type ProjectPayload,
} from "@/features/projects/api/projects.api.ts";
import {ProjectCard} from "@/features/projects/components/project-card.tsx";
import {createListCollection} from "@ark-ui/react";

type ProjectStatusFilter = ProjectStatus | "all";

export function ProjectsPage() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [statusFilter, setStatusFilter] =
        useState<ProjectStatusFilter>("all");

    const projectsQuery = useQuery({
        queryKey: ["projects", { status: statusFilter }],
        queryFn: () =>
            getProjects({
                page: 1,
                limit: 20,
                status: statusFilter === "all" ? undefined : statusFilter,
            }),
    });

    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
            closeForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ProjectPayload }) =>
            updateProject(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
            closeForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleDelete = (project: Project) => {
        deleteMutation.mutate(project.id);
    };

    const openCreateForm = () => {
        setEditingProject(null);
        setOpen(true);
    };

    const closeForm = () => {
        setOpen(false);
        setEditingProject(null);
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = (payload: ProjectPayload) => {
        if (editingProject) {
            updateMutation.mutate({ id: editingProject.id, payload });
            return;
        }

        createMutation.mutate(payload);
    };

    const statusCollection = createListCollection({
        items: [
            { label: "All", value: "all" },
            ...PROJECT_STATUS_VALUES.map((status) => ({
                label: PROJECT_STATUS_LABELS[status],
                value: status,
            })),
        ],
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">Projects</h2>
                <div className="flex items-center gap-2">
                    <Select
                        collection={statusCollection}
                        value={[statusFilter]}
                        onValueChange={({ value }) => {
                            setStatusFilter((value[0] ?? "all") as ProjectStatusFilter);
                        }}
                    >
                        <SelectTrigger
                            className="w-40"
                            aria-label="Filter projects by status"
                        >
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            {statusCollection.items.map((status) => (
                                <SelectItem key={status.value} item={status}>
                                    {status.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="button" onClick={openCreateForm}>
                        <Plus className="size-3"/>
                        Add project
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {projectsQuery.data?.items.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        onDelete={handleDelete}
                        isDeleting={
                            deleteMutation.isPending &&
                            deleteMutation.variables === project.id
                        }
                    />
                ))}
            </div>

            <Sheet onOpenChange={({ open: isOpen }) => setOpen(isOpen)} open={open}>
                <SheetContent variant="inset" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>
                            {editingProject ? "Edit project" : "Add project"}
                        </SheetTitle>
                        <SheetDescription>
                            {editingProject
                                ? "Update project details."
                                : "Create a new project for this company."}
                        </SheetDescription>
                    </SheetHeader>
                    <ProjectForm
                        key={`${editingProject?.id ?? "create-project"}-${open ? "open" : "closed"}`}
                        project={editingProject}
                        errorMessage={
                            createMutation.isError || updateMutation.isError
                                ? "Project could not be saved. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={isSubmitting}
                        submitLabel={editingProject ? "Save changes" : "Create project"}
                        onCancel={closeForm}
                        onSubmit={handleSubmit}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}
