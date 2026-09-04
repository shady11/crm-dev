import {useState} from "react";
import {Link} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Building2, PauseCircle, Pencil, PlayCircle, Plus, Trash2} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
    createCompany,
    type CreateCompanyPayload,
    type CreateCompanyResult,
    deleteCompany,
    getCompanies,
    resumeCompany,
    suspendCompany,
    updateCompany,
} from "../api/companies.api";
import type {Company} from "../types/company.types";
import {isSuspended} from "../types/company.types";
import {CompanyFormSheet} from "../components/company-form-sheet";

type Pending = {action: "suspend" | "resume" | "delete"; company: Company} | null;

export function CompaniesPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Company | null>(null);
    const [created, setCreated] = useState<CreateCompanyResult | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const companies = useQuery({
        queryKey: ["companies", search],
        queryFn: () => getCompanies(search ? {search} : undefined),
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["companies"]});

    const save = useMutation<CreateCompanyResult | Company, Error, CreateCompanyPayload>({
        mutationFn: (payload: CreateCompanyPayload) =>
            editing ? updateCompany(editing.id, payload) : createCompany(payload),
        onSuccess: (result) => {
            void refresh();
            setFormOpen(false);

            if (editing) {
                toast.success("Company updated");
                setEditing(null);
            } else {
                // Held in state, not a toast: the generated password is shown
                // once and a toast that auto-dismisses would lose it.
                setCreated(result as CreateCompanyResult);
            }
        },
        onError: () => toast.error(editing ? "Could not save the company" : "Could not create the company"),
    });

    const act = useMutation<unknown, Error, NonNullable<Pending>>({
        mutationFn: ({action, company}: NonNullable<Pending>) =>
            action === "suspend"
                ? suspendCompany(company.id)
                : action === "resume"
                  ? resumeCompany(company.id)
                  : deleteCompany(company.id),
        onSuccess: (_result, {action, company}) => {
            void refresh();
            setPending(null);
            toast.success(
                action === "suspend"
                    ? `${company.name} suspended`
                    : action === "resume"
                      ? `${company.name} resumed`
                      : `${company.name} deleted`,
            );
        },
        onError: () => toast.error("That did not work"),
    });

    const items = companies.data?.items ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-tight">Companies</h2>
                    <p className="text-muted-foreground text-sm">
                        Tenants on this installation. Each has its own users, projects and deals.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    New company
                </Button>
            </div>

            {created ? (
                <Card className="border-emerald-500/40">
                    <CardHeader>
                        <CardTitle>{created.company.name} is ready</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            Administrator: <span className="font-medium">{created.admin.email}</span>
                        </p>
                        {created.admin.generatedPassword ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">
                                    Generated password — shown once, and not recoverable afterwards:
                                </p>
                                <code className="bg-muted block rounded px-3 py-2 font-mono text-base">
                                    {created.admin.generatedPassword}
                                </code>
                                <p className="text-muted-foreground">
                                    Give it to them directly and have them change it at first login.
                                </p>
                            </div>
                        ) : null}
                        <Button variant="secondary" size="sm" onClick={() => setCreated(null)}>
                            I have saved it
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <Input
                placeholder="Search companies"
                aria-label="Search companies"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-sm"
            />

            {companies.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>No companies yet</EmptyTitle>
                        <EmptyDescription>
                            Create one to onboard a developer onto this installation.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead className="text-right">Users</TableHead>
                                <TableHead className="text-right">Projects</TableHead>
                                <TableHead className="w-0" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((company) => {
                                const suspended = isSuspended(company);

                                return (
                                    <TableRow key={company.id} className={suspended ? "opacity-60" : undefined}>
                                        <TableCell className="font-medium">
                                            <Link className="hover:underline" to={`/companies/${company.id}`}>
                                                {company.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={suspended ? "destructive" : "secondary"}>
                                                {suspended ? "Suspended" : "Active"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{company.currency ?? "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {company._count?.users ?? 0}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {company._count?.projects ?? 0}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={`Edit ${company.name}`}
                                                    onClick={() => {
                                                        setEditing(company);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={
                                                        suspended
                                                            ? `Resume ${company.name}`
                                                            : `Suspend ${company.name}`
                                                    }
                                                    onClick={() =>
                                                        setPending({
                                                            action: suspended ? "resume" : "suspend",
                                                            company,
                                                        })
                                                    }
                                                >
                                                    {suspended ? (
                                                        <PlayCircle className="size-3.5" />
                                                    ) : (
                                                        <PauseCircle className="size-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={`Delete ${company.name}`}
                                                    onClick={() => setPending({action: "delete", company})}
                                                >
                                                    <Trash2 className="text-destructive size-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <CompanyFormSheet
                open={formOpen}
                company={editing}
                isSubmitting={save.isPending}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <ConfirmDialog
                pending={pending}
                isPending={act.isPending}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && act.mutate(pending)}
            />
        </div>
    );
}

const COPY = {
    suspend: {
        title: "Suspend this company?",
        body: "Everyone in this tenant is signed out and cannot log in until it is resumed. Their data is untouched.",
        confirm: "Suspend",
    },
    resume: {
        title: "Resume this company?",
        body: "Its users will be able to log in again immediately.",
        confirm: "Resume",
    },
    delete: {
        title: "Delete this company?",
        body: "It disappears from this list and its users can no longer log in. Their projects, deals and payment history are kept, but there is no way to undo this from the interface.",
        confirm: "Delete",
    },
} as const;

function ConfirmDialog({
    pending,
    isPending,
    onCancel,
    onConfirm,
}: {
    pending: Pending;
    isPending: boolean;
    onCancel(): void;
    onConfirm(): void;
}) {
    const copy = pending ? COPY[pending.action] : null;

    return (
        <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {pending ? (
                            <>
                                <span className="font-medium">{pending.company.name}</span> — {copy?.body}
                            </>
                        ) : null}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={isPending} onClick={onConfirm}>
                        {isPending ? "Working..." : copy?.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
