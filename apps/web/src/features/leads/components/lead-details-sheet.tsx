import {Pen, Trash2, UserPlusIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LeadOverview} from "@/features/leads/components/lead-overview.tsx";
import {LeadClientTab} from "@/features/leads/components/lead-client-tab.tsx";
import {useTranslation} from "react-i18next";

interface LeadDetailsSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange(open: boolean): void;
    onEdit(): void;
    onRequestConvert(): void;
    onRequestDelete(): void;
}

export function LeadDetailsSheet({
                                      lead,
                                      open,
                                      onOpenChange,
                                      onEdit,
                                      onRequestConvert,
                                      onRequestDelete,
                                  }: LeadDetailsSheetProps) {
    const { t } = useTranslation("leads");

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
                                <TabsTrigger value="client">{t("detailsSheet.clientTab")}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <LeadOverview lead={lead} />
                            </TabsContent>

                            <TabsContent value="client">
                                <LeadClientTab lead={lead} onConvert={onRequestConvert} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </SheetBody>

                <SheetFooter>
                    <Button variant="destructive" size="icon-md" onClick={onRequestDelete}>
                        <Trash2 className="size-4" />
                    </Button>
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
