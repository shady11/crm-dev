import {ArrowLeftRight, Pen, Repeat, Trash2, UserPlusIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {IconTooltipButton} from "@/components/shared/icon-tooltip-button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LeadOverview} from "@/features/leads/components/lead-overview.tsx";
import {LeadClientTab} from "@/features/leads/components/lead-client-tab.tsx";
import {LeadActivityTab} from "@/features/leads/components/lead-activity-tab.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {useTranslation} from "react-i18next";

interface LeadDetailsSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange(open: boolean): void;
    onEdit(): void;
    onRequestConvert(): void;
    onRequestDelete(): void;
    onRequestTransferBranch(): void;
    onRequestReassign(): void;
}

export function LeadDetailsSheet({
                                      lead,
                                      open,
                                      onOpenChange,
                                      onEdit,
                                      onRequestConvert,
                                      onRequestDelete,
                                      onRequestTransferBranch,
                                      onRequestReassign,
                                  }: LeadDetailsSheetProps) {
    const { t } = useTranslation("leads");
    const { user } = useAuth();
    const canTransferBranch = hasPermission(user, "leads.transfer_branch");
    // SH-A1: reassignment is a team-lead action, gated the same way the
    // backend endpoint is (leads.assign) rather than by a specific role name.
    const canReassign = hasPermission(user, "leads.assign");

    if (!lead) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={({ open: isOpen }) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-lg" variant="inset">
                <SheetHeader>
                    <SheetTitle>{lead.fullName}</SheetTitle>
                </SheetHeader>

                <SheetBody scrollFade>
                    <div className="py-4">
                        <Tabs defaultValue="overview" className="gap-6">
                            <TabsList>
                                <TabsTrigger value="overview">{t("detailsSheet.overviewTab")}</TabsTrigger>
                                <TabsTrigger value="activity">{t("detailsSheet.activityTab")}</TabsTrigger>
                                <TabsTrigger value="client">{t("detailsSheet.clientTab")}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <LeadOverview lead={lead} />
                            </TabsContent>

                            <TabsContent value="activity">
                                <LeadActivityTab lead={lead} />
                            </TabsContent>

                            <TabsContent value="client">
                                <LeadClientTab lead={lead} onConvert={onRequestConvert} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </SheetBody>

                <SheetFooter>
                    <IconTooltipButton variant="destructive" size="icon-md" onClick={onRequestDelete} label={t("common:actions.delete")}>
                        <Trash2 className="size-4" />
                    </IconTooltipButton>
                    {canTransferBranch && (
                        <Button
                            variant="secondary"
                            size="icon-md"
                            aria-label={t("detailsSheet.transferBranch.action")}
                            onClick={onRequestTransferBranch}
                        >
                            <ArrowLeftRight className="size-4" />
                        </Button>
                    )}
                    {canReassign && (
                        <Button
                            variant="secondary"
                            size="icon-md"
                            aria-label={t("detailsSheet.reassign.action")}
                            onClick={onRequestReassign}
                        >
                            <Repeat className="size-4" />
                        </Button>
                    )}
                    <Button variant="secondary" className="flex-1" onClick={onEdit}>
                        <Pen className="size-4" />
                        {t("detailsSheet.edit")}
                    </Button>
                    {!lead.client && (
                        <Button className="flex-1" onClick={onRequestConvert}>
                            <UserPlusIcon className="size-4" />
                            {t("detailsSheet.convert")}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
