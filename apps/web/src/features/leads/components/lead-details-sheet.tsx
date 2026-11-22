import {ArrowLeftRight, EllipsisVerticalIcon, LayoutGridIcon, Pen, Repeat, Trash2, UserPlusIcon} from "lucide-react";
import {Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger} from "@/components/ui/menu.tsx";
import {Button} from "@/components/ui/button.tsx";
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

                <SheetFooter className="flex-row justify-between">
                    {/* Secondary actions tucked behind "⋯"; the main action stands apart. */}
                    <Menu positioning={{placement: "top-start"}}>
                        <MenuTrigger asChild>
                            <Button variant="outline" size="icon-md" aria-label={t("common:actions.moreActions")} title={t("common:actions.moreActions")}>
                                <EllipsisVerticalIcon className="size-4" />
                            </Button>
                        </MenuTrigger>
                        <MenuContent className="min-w-52">
                            <MenuItem value="edit" onClick={onEdit}>
                                <Pen />
                                {t("detailsSheet.edit")}
                            </MenuItem>
                            {canReassign && (
                                <MenuItem value="reassign" onClick={onRequestReassign}>
                                    <Repeat />
                                    {t("detailsSheet.reassign.action")}
                                </MenuItem>
                            )}
                            {canTransferBranch && (
                                <MenuItem value="transfer-branch" onClick={onRequestTransferBranch}>
                                    <ArrowLeftRight />
                                    {t("detailsSheet.transferBranch.action")}
                                </MenuItem>
                            )}
                            {canDelete && (
                                <>
                                    <MenuSeparator />
                                    <MenuItem value="delete" variant="destructive" onClick={onRequestDelete}>
                                        <Trash2 />
                                        {t("common:actions.delete")}
                                    </MenuItem>
                                </>
                            )}
                        </MenuContent>
                    </Menu>
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
