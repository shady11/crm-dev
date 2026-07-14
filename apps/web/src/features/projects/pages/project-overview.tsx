import {useParams} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {getProject} from "../api/projects.api";
import {OverviewCards} from "@/features/projects/components/overview/overview-cards.tsx";
import {Loader2} from "lucide-react";

export function ProjectOverview() {
    const { projectId } = useParams();

    const projectQuery = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => getProject(projectId!),
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
        return <div>Project not found</div>;
    }

    const project = projectQuery.data;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Project Overview</h2>
            </div>

            <OverviewCards project={project}/>
        </div>
    );
}