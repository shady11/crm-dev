import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {MoreVertical} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
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
    type Unit,
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABEL_KEYS,
    UNIT_TYPE_LABEL_KEYS
} from "@/features/units/types/unit.types.ts";
import {deleteUnit, updateUnit} from "@/features/units/api/units.api.ts";
import {UnitForm} from "./unit-form.tsx";
import {api} from "@/lib/api.ts";
import {Menu, MenuContent, MenuGroup, MenuItem, MenuSeparator, MenuTrigger} from "@/components/ui/menu.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface UnitTableProps {
    units: Unit[];
}

export function UnitTable({ units }: UnitTableProps) {
    const { t } = useTranslation("units");
    const { formatCurrency } = useCompanyFormatters();
    const { user } = useAuth();
    // Matches the API's per-endpoint @Roles: edit is COMPANY_ADMIN/SALES_HEAD
    // (PATCH /units/:id), duplicate and delete are COMPANY_ADMIN only.
    const canEdit = user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.SALES_HEAD;
    const canDuplicate = user?.role === UserRole.COMPANY_ADMIN;
    const canDelete = user?.role === UserRole.COMPANY_ADMIN;
    const hasAnyRowAction = canEdit || canDuplicate || canDelete;

    const queryClient = useQueryClient();

    const [unitSheet, setUnitSheet] = useState<{
        open: boolean;
        unit?: Unit | null;
    } | null>(null);

    const [deleteUnitDialog, setDeleteUnitDialog] = useState<Unit | null>(null);

    const updateUnitMutation = useMutation({
        mutationFn: ({ unitId, payload }: { unitId: string; payload: any }) =>
            updateUnit(unitId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.updatedTitle"),
            });

            setUnitSheet(null);
        },
    });

    const duplicateUnitMutation = useMutation({
        mutationFn: (unitId: string) => api.post(`/units/${unitId}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.duplicatedTitle"),
            });
        },
    });

    const deleteUnitMutation = useMutation({
        mutationFn: (unitId: string) => deleteUnit(unitId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.deletedTitle"),
            });

            setDeleteUnitDialog(null);
        },
    });

    return (
        <div className="px-6">
            <Card className="border border-t-0 rounded-none rounded-b-lg ring-0">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-25">{t("table.numberHeader")}</TableHead>
                                <TableHead>{t("common:labels.status")}</TableHead>
                                <TableHead>{t("common:labels.type")}</TableHead>
                                <TableHead>{t("common:labels.area")}</TableHead>
                                <TableHead>{t("common:labels.price")}</TableHead>
                                <TableHead className="text-right">{t("table.actionsHeader")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {units.map((unit: Unit) => (
                                <TableRow key={unit.id}>
                                    <TableCell className="font-medium">№{unit.number}</TableCell>
                                    <TableCell>
                                        <Badge className={`${UNIT_STATUS_CLASSES[unit.status]} text-white`}>
                                            {t(UNIT_STATUS_LABEL_KEYS[unit.status])}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{t(UNIT_TYPE_LABEL_KEYS[unit.type])}</TableCell>
                                    <TableCell>{unit.area} {t("common:units.sqm")}</TableCell>
                                    <TableCell>{formatCurrency(parseFloat(unit.price))}</TableCell>
                                    <TableCell className="text-right">
                                        {hasAnyRowAction && (
                                            <Menu>
                                                <MenuTrigger asChild>
                                                    <Button variant="ghost" size="icon-sm" aria-label={t("common:actions.moreActions")}>
                                                        <MoreVertical />
                                                    </Button>
                                                </MenuTrigger>
                                                <MenuContent>
                                                    {(canEdit || canDuplicate) && (
                                                        <MenuGroup>
                                                            {canEdit && (
                                                                <MenuItem
                                                                    value="edit"
                                                                    onClick={() => setUnitSheet({
                                                                        open: true,
                                                                        unit: unit,
                                                                    })}
                                                                >{t("common:actions.edit")}</MenuItem>
                                                            )}
                                                            {canDuplicate && (
                                                                <MenuItem
                                                                    value="diplicate"
                                                                    onClick={() => duplicateUnitMutation.mutate(unit.id)}
                                                                >{t("common:actions.duplicate")}</MenuItem>
                                                            )}
                                                        </MenuGroup>
                                                    )}
                                                    {canDelete && (
                                                        <>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                value="delete"
                                                                variant="destructive"
                                                                onClick={() => setDeleteUnitDialog(unit)}
                                                            >{t("common:actions.delete")}</MenuItem>
                                                        </>
                                                    )}
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Unit Form Sheet (Edit) */}
            {unitSheet && (
                <Sheet
                    open={unitSheet.open}
                    onOpenChange={({ open: isOpen }) => setUnitSheet(isOpen ? unitSheet : null)}
                >
                    <SheetContent className="sm:max-w-sm" variant="inset">
                        <SheetHeader>
                            <SheetTitle>{t("sheets.editTitle", { number: unitSheet.unit?.number })}</SheetTitle>
                        </SheetHeader>
                        <UnitForm
                            key={`unit-${unitSheet.unit?.id}-${unitSheet.open ? "open" : "closed"}`}
                            unit={unitSheet.unit}
                            errorMessage={
                                updateUnitMutation.isError
                                    ? t("form.errorSave")
                                    : undefined
                            }
                            isSubmitting={updateUnitMutation.isPending}
                            submitLabel={t("common:actions.saveChanges")}
                            onCancel={() => setUnitSheet(null)}
                            onSubmit={(payload) => {
                                if (unitSheet.unit) {
                                    updateUnitMutation.mutate({
                                        unitId: unitSheet.unit.id,
                                        payload,
                                    });
                                }
                            }}
                        />
                    </SheetContent>
                </Sheet>
            )}

            {/* Delete Unit Dialog */}
            <AlertDialog
                open={!!deleteUnitDialog}
                onOpenChange={({ open: isOpen }) => setDeleteUnitDialog(isOpen ? deleteUnitDialog : null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("delete.description", { number: deleteUnitDialog?.number })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteUnitMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteUnitMutation.isPending}
                            onClick={() => deleteUnitDialog && deleteUnitMutation.mutate(deleteUnitDialog.id)}
                        >
                            {deleteUnitMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}