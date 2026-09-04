import {Link, useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {ArrowLeft} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types";
import {getCompany} from "../api/companies.api";
import {isSuspended} from "../types/company.types";

export function CompanyDetailPage() {
    const {companyId} = useParams<{companyId: string}>();
    const {t} = useTranslation("users");

    const company = useQuery({
        queryKey: ["companies", companyId],
        queryFn: () => getCompany(companyId as string),
        enabled: Boolean(companyId),
    });

    if (company.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!company.data) {
        return <p className="text-muted-foreground">Company not found.</p>;
    }

    const data = company.data;
    const suspended = isSuspended(data);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <Button asChild size="sm" variant="ghost" className="-ml-2">
                        <Link to="/companies">
                            <ArrowLeft className="size-4" />
                            Companies
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-medium tracking-tight">{data.name}</h2>
                        <Badge variant={suspended ? "destructive" : "secondary"}>
                            {suspended ? "Suspended" : "Active"}
                        </Badge>
                    </div>
                </div>
            </div>

            {suspended ? (
                <Card className="border-destructive/40">
                    <CardContent className="py-4 text-sm">
                        Suspended on {new Date(data.suspendedAt as string).toLocaleDateString()}. Nobody in
                        this tenant can log in until it is resumed. Their data is untouched.
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Projects" value={data.stats.projects} />
                <Stat label="Units" value={data.stats.units} />
                <Stat label="Clients" value={data.stats.clients} />
                <Stat label="Leads" value={data.stats.leads} />
                <Stat label="Deals" value={data.stats.deals} />
                <Stat label="Deals in play" value={data.stats.activeDeals} hint="Reserved, signed or active" />
                <Stat label="Users" value={data.stats.users} />
                <Stat label="Active users" value={data.stats.activeUsers} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataList className="divide-y">
                            <Row label="Currency" value={data.currency} />
                            <Row label="Locale" value={data.locale} />
                            <Row label="Timezone" value={data.timezone} />
                            <Row label="Phone" value={data.phone} />
                            <Row label="Address" value={data.address} />
                            <Row label="Created" value={new Date(data.createdAt).toLocaleDateString()} />
                        </DataList>
                    </CardContent>
                </Card>

                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.users.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No users. This tenant cannot be logged into.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.fullName}</div>
                                                <div className="text-muted-foreground text-xs">{user.email}</div>
                                            </TableCell>
                                            <TableCell>{t(USER_ROLE_LABEL_KEYS[user.role])}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.isActive ? "secondary" : "outline"}>
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Stat({label, value, hint}: {label: string; value: number; hint?: string}) {
    return (
        <Card className="border-secondary shadow-none">
            <CardContent className="py-4">
                <div className="text-2xl font-medium tabular-nums">{value}</div>
                <div className="text-muted-foreground mt-1 text-xs">{label}</div>
                {hint ? <div className="text-muted-foreground/70 mt-0.5 text-[11px]">{hint}</div> : null}
            </CardContent>
        </Card>
    );
}

function Row({label, value}: {label: string; value: string | null}) {
    return (
        <DataListItem className="justify-between py-2">
            <DataListItemLabel>{label}</DataListItemLabel>
            <DataListItemValue className="flex-none">{value || "—"}</DataListItemValue>
        </DataListItem>
    );
}
