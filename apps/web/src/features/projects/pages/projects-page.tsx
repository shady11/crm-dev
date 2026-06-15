import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { getProjects } from "../api/projects.api";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function ProjectsPage() {
    const projectsQuery = useQuery({
        queryKey: ["projects"],
        queryFn: () =>
            getProjects({
                page: 1,
                limit: 20,
            }),
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                <p className="text-muted-foreground">
                    Residential complexes and construction objects.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Project list
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {projectsQuery.isLoading && (
                        <div className="text-sm text-muted-foreground">
                            Loading projects...
                        </div>
                    )}

                    {projectsQuery.isError && (
                        <div className="text-sm text-destructive">
                            Failed to load projects.
                        </div>
                    )}

                    {projectsQuery.data && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Blocks</TableHead>
                                    <TableHead>Units</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {projectsQuery.data.items.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">
                                            {project.name}
                                        </TableCell>
                                        <TableCell>{project.address ?? "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{project.status}</Badge>
                                        </TableCell>
                                        <TableCell>{project._count?.blocks ?? 0}</TableCell>
                                        <TableCell>{project._count?.units ?? 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}