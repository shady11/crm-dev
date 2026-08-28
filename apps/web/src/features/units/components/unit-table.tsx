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
    UNIT_TYPE_LABELS
} from "@/features/units/types/unit.types.ts";
import {deleteUnit, updateUnit} from "@/features/units/api/units.api.ts";
import {UnitForm} from "./unit-form.tsx";
import {api} from "@/lib/api.ts";
import {Menu, MenuContent, MenuGroup, MenuItem, MenuSeparator, MenuTrigger} from "@/components/ui/menu.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";

interface UnitTableProps {
    units: Unit[];
}

export function UnitTable({ units }: UnitTableProps) {
    const { t } = useTranslation("units");

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
                title: "Successfully updated",
            });

            setUnitSheet(null);
        },
    });

    const duplicateUnitMutation = useMutation({
        mutationFn: (unitId: string) => api.post(`/units/${unitId}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully duplicated",
            });
        },
    });

    const deleteUnitMutation = useMutation({
        mutationFn: (unitId: string) => deleteUnit(unitId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully deleted",
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
                                <TableHead className="w-25">Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Area</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                    <TableCell>{UNIT_TYPE_LABELS[unit.type]}</TableCell>
                                    <TableCell>{unit.area} m<sup>2</sup></TableCell>
                                    <TableCell>{unit.price} $</TableCell>
                                    <TableCell className="text-right">
                                        <Menu>
                                            <MenuTrigger asChild>
                                                <Button variant="ghost" size="icon-sm">
                                                    <MoreVertical />
                                                </Button>
                                            </MenuTrigger>
                                            <MenuContent>
                                                <MenuGroup>
                                                    <MenuItem
                                                        value="edit"
                                                        onClick={() => setUnitSheet({
                                                            open: true,
                                                            unit: unit,
                                                        })}
                                                    >
                                                        Edit
                                                    </MenuItem>
                                                    <MenuItem
                                                        value="diplicate"
                                                        onClick={() => duplicateUnitMutation.mutate(unit.id)}
                                                    >
                                                        Duplicate
                                                    </MenuItem>
                                                </MenuGroup>
                                                <MenuSeparator />
                                                <MenuItem
                                                    value="delete"
                                                    variant="destructive"
                                                    onClick={() => setDeleteUnitDialog(unit)}
                                                >
                                                    Delete
                                                </MenuItem>
                                            </MenuContent>
                                        </Menu>
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
                            <SheetTitle>Edit unit №{unitSheet.unit?.number}</SheetTitle>
                        </SheetHeader>
                        <UnitForm
                            key={`unit-${unitSheet.unit?.id}-${unitSheet.open ? "open" : "closed"}`}
                            unit={unitSheet.unit}
                            errorMessage={
                                updateUnitMutation.isError
                                    ? "Unit could not be saved. Check the details and try again."
                                    : undefined
                            }
                            isSubmitting={updateUnitMutation.isPending}
                            submitLabel="Save changes"
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
                        <AlertDialogTitle>Delete unit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete Unit №{deleteUnitDialog?.number}.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteUnitMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteUnitMutation.isPending}
                            onClick={() => deleteUnitDialog && deleteUnitMutation.mutate(deleteUnitDialog.id)}
                        >
                            {deleteUnitMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}