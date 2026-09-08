import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useNavigate, useParams} from "react-router-dom";
import {ArrowLeft, ArrowLeftRight, MailIcon, Pen, PhoneIcon} from "lucide-react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {ClientFormSheet} from "@/features/clients/components/client-form-sheet.tsx";
import {useClient} from "@/features/clients/hooks/use-client.ts";
import {initials} from "@/features/clients/utils/format.ts";
import {
    transferClientBranch,
    updateClient,
    type UpdateClientPayload,
} from "@/features/clients/api/clients.api.ts";
import {ClientTasksCard} from "@/features/tasks/components/client-tasks-card.tsx";
import {DEAL_STATUS_LABEL_KEYS, DEAL_STATUS_VISUALS} from "@/features/deals/types/deal.types.ts";
import {LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {paths} from "@/routes/paths.ts";
import {EntityDocumentsCard} from "@/features/documents/components/entity-documents-card.tsx";
import {WhatsAppLink} from "@/components/shared/whatsapp-link.tsx";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";
import {MoveToBranchDialog} from "@/features/branches/components/move-to-branch-dialog.tsx";

export function ClientDetailsPage() {
    const { t, i18n } = useTranslation(["clients", "deals", "leads", "common", "branches"]);
    const { formatCurrency } = useCompanyFormatters();
    const { user } = useAuth();
    const isCompanyAdmin = user?.role === UserRole.COMPANY_ADMIN;
    const { clientId } = useParams<{ clientId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const clientQuery = useClient(clientId);
    const [editOpen, setEditOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const transferBranchMutation = useMutation({
        mutationFn: (branchId: string) => transferClientBranch(clientId!, branchId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["client", clientId] });
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("moveDialog.success", { ns: "branches", name: clientQuery.data?.fullName }) });
            setTransferOpen(false);
        },
        onError: () => {
            toast.error({ title: t("moveDialog.error", { ns: "branches" }) });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateClientPayload) => updateClient(clientId!, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["client", clientId] });
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("detail.updateSuccessTitle"), description: t("detail.updateSuccessDescription") });
            setEditOpen(false);
        },
        onError: () => {
            toast.error({ title: t("detail.updateErrorTitle"), description: t("detail.updateErrorDescription") });
        },
    });

    const client = clientQuery.data;
    if (!client) return null;

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                            <AvatarFallback className="text-base">{initials(client.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-semibold">{client.fullName}</h1>
                            <p className="text-sm text-muted-foreground">
                                #{client.id.slice(0, 8).toUpperCase()} · {t("detail.clientSince", { date: new Date(client.createdAt).toLocaleDateString(i18n.language) })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => navigate(paths.clients.root)}>
                            <ArrowLeft className="size-3"/>
                            {t("actions.back", { ns: "common" })}
                        </Button>
                        {isCompanyAdmin && (
                            <Button variant="secondary" onClick={() => setTransferOpen(true)}>
                                <ArrowLeftRight className="size-3" />
                                {t("moveDialog.title", { ns: "branches" })}
                            </Button>
                        )}
                        <Button variant="default" onClick={() => setEditOpen(true)}>
                            <Pen className="size-3"/>
                            {t("actions.edit", { ns: "common" })}
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border border-secondary shadow-none">
                <CardContent>
                    <DataList className="divide-y">
                        <DataListItem>
                            <DataListItemLabel>{t("detail.phone")}</DataListItemLabel>
                            <DataListItemValue className="flex items-center gap-3">
                                <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                                    <PhoneIcon size={14} />{client.phone}
                                </a>
                                <WhatsAppLink phone={client.whatsapp || client.phone} />
                            </DataListItemValue>
                        </DataListItem>
                        {client.whatsapp && (
                            <DataListItem>
                                <DataListItemLabel>{t("detail.whatsapp")}</DataListItemLabel>
                                <DataListItemValue>{client.whatsapp}</DataListItemValue>
                            </DataListItem>
                        )}
                        {client.email && (
                            <DataListItem>
                                <DataListItemLabel>{t("detail.email")}</DataListItemLabel>
                                <DataListItemValue>
                                    <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                                        <MailIcon size={14} />{client.email}
                                    </a>
                                </DataListItemValue>
                            </DataListItem>
                        )}
                        {client.passport && (
                            <DataListItem>
                                <DataListItemLabel>{t("detail.passport")}</DataListItemLabel>
                                <DataListItemValue>{client.passport}</DataListItemValue>
                            </DataListItem>
                        )}
                        {client.pin && (
                            <DataListItem>
                                <DataListItemLabel>{t("detail.pin")}</DataListItemLabel>
                                <DataListItemValue>{client.pin}</DataListItemValue>
                            </DataListItem>
                        )}
                    </DataList>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border border-secondary shadow-none pt-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm text-muted-foreground">
                            {client.deals.length > 0 ? t("detail.dealsWithCount", { count: client.deals.length }) : t("detail.deals")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {client.deals.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("detail.noDeals")}</p>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {client.deals.map((deal) => {
                                    const visual = DEAL_STATUS_VISUALS[deal.status];
                                    return (
                                        <Link
                                            key={deal.id}
                                            to={paths.deals.detail(deal.id)}
                                            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-secondary/40"
                                        >
                                            <div>
                                                <p className="font-medium">{deal.dealNumber ?? t("detail.unitFallback", { number: deal.unit.number })}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {deal.unit.project?.name}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {deal.salePrice != null && (
                                                    <p className="font-medium">{formatCurrency(Number(deal.salePrice))}</p>
                                                )}
                                                <Badge className={`${visual?.bg} text-white`}>{t(DEAL_STATUS_LABEL_KEYS[deal.status])}</Badge>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-secondary shadow-none pt-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm text-muted-foreground">
                            {client.leads.length > 0 ? t("detail.leadsWithCount", { count: client.leads.length }) : t("table.leads")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {client.leads.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("detail.noLeadsYet")}</p>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {client.leads.map((lead) => (
                                    <div key={lead.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                        <div>
                                            <p className="font-medium">{lead.fullName}</p>
                                            {lead.source && <p className="text-xs text-muted-foreground">{lead.source}</p>}
                                        </div>
                                        <Badge variant="secondary">{t(LEAD_STATUS_LABEL_KEYS[lead.status])}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ClientTasksCard clientId={client.id} />
            <EntityDocumentsCard ownerType="CLIENT" ownerId={client.id} />

            <ClientFormSheet
                open={editOpen}
                client={{ ...client, _count: { leads: client.leads.length, deals: client.deals.length } }}
                isSubmitting={updateMutation.isPending}
                hasError={updateMutation.isError}
                onClose={() => setEditOpen(false)}
                onSubmit={(payload) => updateMutation.mutate(payload as UpdateClientPayload)}
            />

            <MoveToBranchDialog
                open={transferOpen}
                entityName={client.fullName}
                currentBranchId={client.branchId}
                isSubmitting={transferBranchMutation.isPending}
                onOpenChange={setTransferOpen}
                onConfirm={(branchId) => transferBranchMutation.mutate(branchId)}
            />
        </div>
    );
}