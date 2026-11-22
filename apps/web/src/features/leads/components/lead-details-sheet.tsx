import {ArrowLeftRight, LayoutGridIcon, Pen, Repeat, Trash2, UserPlusIcon} from "lucide-react";
import {ButtonGroup} from "@/components/ui/button-group.tsx";
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
    /** E2E-8: offered once the lead has a client, to whoever can reserve. */
    onRequestReserve?(): void;
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
                                      onRequestReserve,
                                      onRequestDelete,
                                      onRequestTransferBranch,
                                      onRequestReassign,
                                  }: LeadDetailsSheetProps) {
    const { t } = useTranslation("leads");
    const { user } = useAuth();
    const canTransferBranch = hasPermission(user, "leads.transfer_branch");
    const canDelete = hasPermission(user, "leads.delete");
    // SH-A1: reassignment is a team-lead action, gated the same way the
    // backend endpoint is (leads.assign) rather than by a specific role name.
    const canReassign = hasPermission(user, "leads.assign");

    if (!lead) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={({ open: isOpen }) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-xl" variant="inset">
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

                <SheetFooter className="sm:justify-between">
                    {/* Secondary actions joined in one group; the main action stands apart. */}
                    <ButtonGroup className="w-full sm:w-fit [&>*]:rounded-none [&>*:first-child]:rounded-s-lg [&>*:last-child]:rounded-e-lg">
                    {canDelete && (
                        <IconTooltipButton variant="outline" size="icon-md" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRequestDelete} label={t("common:actions.delete")}>
                            <Trash2 className="size-4" />
                        </IconTooltipButton>
                    )}
                    {canTransferBranch && (
                        <IconTooltipButton
                            variant="outline"
                            size="icon-md"
                            label={t("detailsSheet.transferBranch.action")}
                            onClick={onRequestTransferBranch}
                        >
                            <ArrowLeftRight className="size-4" />
                        </IconTooltipButton>
                    )}
                    {canReassign && (
                        <Button
                            variant="outline"
                            title={t("detailsSheet.reassign.action")}
                            onClick={onRequestReassign}
                        >
                            <Repeat className="size-4" />
                            {/* Icon only on a phone so the group fits; the title names it. */}
                            <span className="hidden sm:inline">{t("detailsSheet.reassign.short")}</span>
                        </Button>
                    )}
                    <Button variant="outline" onClick={onEdit}>
                        <Pen className="size-4" />
                        {t("detailsSheet.edit")}
                    </Button>
                    </ButtonGroup>
                    {!lead.client && (
                        <Button onClick={onRequestConvert}>
                            <UserPlusIcon className="size-4" />
                            {t("detailsSheet.convert")}
                        </Button>
                    )}
                    {lead.client && onRequestReserve && (
                        <Button onClick={onRequestReserve}>
                            <LayoutGridIcon className="size-4" />
                            {t("reserveUnit")}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
