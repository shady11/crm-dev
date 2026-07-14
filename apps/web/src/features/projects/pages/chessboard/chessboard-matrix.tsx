import { useState, useMemo } from "react";
import {useParams, useNavigate} from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUnit } from "@/features/units/api/units.api";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { cn } from "@/lib/utils";
import { type Unit, type UnitStatus, UNIT_STATUS_LABELS, UNIT_TYPE_LABELS } from "@/features/units/types/unit.types";
import type {Project} from "@/features/projects/types/project.types.ts";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {UnitForm} from "@/features/units/components/unit-form.tsx";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList
} from "@/components/ui/breadcrumb.tsx";
import {ArrowLeftIcon, ChevronDownIcon, Loader2Icon} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {getProjectTree} from "@/features/projects/api/projects.api.ts";
import {Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger} from "@/components/ui/menu.tsx";

const STATUS_CELL_STYLES: Record<UnitStatus, string> = {
    AVAILABLE: "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400",
    BOOKED: "bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400",
    SOLD: "bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400",
    INSTALLMENT: "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400",
    MORTGAGE: "bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400",
    UNAVAILABLE: "bg-gray-100 border-gray-300 hover:bg-gray-200",
};

const STATUS_STYLES: Record<UnitStatus, { bg: string; border: string; text: string; dot: string }> = {
    AVAILABLE: {
        bg: "bg-emerald-50 hover:bg-emerald-100",
        border: "border-emerald-300 hover:border-emerald-400",
        text: "text-emerald-700",
        dot: "bg-emerald-500"
    },
    BOOKED: {
        bg: "bg-amber-50 hover:bg-amber-100",
        border: "border-amber-300 hover:border-amber-400",
        text: "text-amber-700",
        dot: "bg-amber-500"
    },
    SOLD: {
        bg: "bg-red-50 hover:bg-red-100",
        border: "border-red-300 hover:border-red-400",
        text: "text-red-700",
        dot: "bg-red-500"
    },
    INSTALLMENT: {
        bg: "bg-blue-50 hover:bg-blue-100",
        border: "border-blue-300 hover:border-blue-400",
        text: "text-blue-700",
        dot: "bg-blue-500"
    },
    MORTGAGE: {
        bg: "bg-purple-50 hover:bg-purple-100",
        border: "border-purple-300 hover:border-purple-400",
        text: "text-purple-700",
        dot: "bg-purple-500"
    },
    UNAVAILABLE: {
        bg: "bg-gray-100 hover:bg-gray-200",
        border: "border-gray-300",
        text: "text-gray-500",
        dot: "bg-gray-400"
    },
};

export function ChessboardMatrix() {
    const { projectId, blockId, entranceId } = useParams<{
        projectId: string;
        blockId: string;
        entranceId: string;
    }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<UnitStatus | "all">("all");
    const [floorFilter, setFloorFilter] = useState<string>("all");
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const treeQuery = useQuery({
        queryKey: ["project-tree", projectId],
        queryFn: () => getProjectTree(projectId!),
        enabled: !!projectId,
    });

    const updateUnitMutation = useMutation({
        mutationFn: ({ unitId, payload }: { unitId: string; payload: any }) =>
            updateUnit(unitId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
            setEditingUnit(null);
            setSelectedUnit(null);
        },
    });

    const tree = treeQuery.data as Project | undefined;
    const block = tree?.blocks.find((b: Block) => b.id === blockId);
    const entrance = block?.entrances.find((e: Entrance) => e.id === entranceId);

    const blocks = tree?.blocks || [];
    const blockEntrances = block?.entrances || [];

    // Build matrix data with filters
    const matrixData = useMemo(() => {
        if (!entrance) return null;

        let floors = [...entrance.floors];

        // Floor filter
        if (floorFilter !== "all") {
            floors = floors.filter(f => f.id === floorFilter);
        }

        const sortedFloors = floors.sort((a, b) => b.number - a.number);

        // Get all units with optional status filter
        let allUnits = sortedFloors.flatMap(f => f.units);
        if (statusFilter !== "all") {
            allUnits = allUnits.filter(u => u.status === statusFilter);
        }

        // Get unique positions from filtered units
        const allUnitNumbers = allUnits.map(u => u.number);
        const uniquePositions = [...new Set(allUnitNumbers)].sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });

        return {
            entrance,
            floors: sortedFloors,
            positions: uniquePositions,
            totalFilteredUnits: allUnits.length,
        };
    }, [entrance, floorFilter, statusFilter]);

    const getUnitAt = (floor: Floor, position: string): Unit | undefined => {
        return floor.units.find(u => u.number === position);
    };

    const entranceFloors = useMemo(() => {
        if (!entrance) return [];
        return [...entrance.floors].sort((a, b) => b.number - a.number);
    }, [entrance]);

    if (treeQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!block || !entrance) {
        return (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
                <p>Not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Button variant="outline" size="icon-sm" onClick={() => navigate("..")}>
                                <ArrowLeftIcon className="size-3" />
                            </Button>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                        <Menu>
                            <MenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex gap-3">
                                    Block {block.name}
                                    <ChevronDownIcon className="size-3" />
                                </Button>
                            </MenuTrigger>
                            <MenuContent>
                                <MenuGroup>
                                    {blocks.map((block) => (
                                        <MenuItem
                                            key={block.id}
                                            onClick={() => navigate(`../../${block.id}`)}
                                        >
                                            Block {block.name}
                                        </MenuItem>
                                    ))}
                                </MenuGroup>
                            </MenuContent>
                        </Menu>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                        <Menu>
                            <MenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex gap-3">
                                    Entrance {entrance.name}
                                    <ChevronDownIcon className="size-3" />
                                </Button>
                            </MenuTrigger>
                            <MenuContent>
                                <MenuGroup>
                                    {blockEntrances.map((entrance) => (
                                        <MenuItem key={entrance.id} onClick={() => navigate(`../${entrance.id}`)}>Entrance {entrance.name}</MenuItem>
                                    ))}
                                </MenuGroup>
                            </MenuContent>
                        </Menu>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Filters Bar */}
            <Card className="ring-0 border-0 bg-card shadow-sm">
                <CardContent>
                    <FieldGroup>
                        <div className="flex items-center gap-4">
                            <Field>
                                <FieldLabel htmlFor="checkout-exp-month-ts6">
                                    Floor
                                </FieldLabel>
                                <Select value={floorFilter} onValueChange={setFloorFilter}>
                                    <SelectTrigger size="sm">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {entranceFloors.map((floor) => (
                                            <SelectItem key={floor.id} item={floor.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>Floor {floor.number}</span>
                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                        {floor.units.length}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="checkout-exp-month-ts6">
                                    Status
                                </FieldLabel>
                                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UnitStatus | "all")}>
                                    <SelectTrigger size="sm">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {Object.entries(UNIT_STATUS_LABELS).map(([status, label]) => (
                                            <SelectItem key={status} item={status}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("size-2 rounded-full", STATUS_STYLES[status as UnitStatus].dot)} />
                                                    <span>{label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            {/* Results count */}
                            {matrixData && (
                                <div className="ml-auto">
                                    <Badge variant="secondary">
                                        {matrixData.totalFilteredUnits} unit{matrixData.totalFilteredUnits !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">Open Menu</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuCheckboxItem
                                    >
                                        Option Label
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </FieldGroup>
                </CardContent>
            </Card>

            {/* Matrix Chessboard */}
            {matrixData && matrixData.floors.length > 0 && matrixData.positions.length > 0 ? (
                <Card>
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <h3 className="text-sm font-semibold">Matrix View</h3>
                        <Badge variant="secondary" className="ml-auto">
                            {matrixData.floors.length} floors × {matrixData.positions.length} positions
                        </Badge>
                    </div>
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <ScrollBar orientation="horizontal" />
                            <div className="min-w-max">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="sticky left-0 z-10 bg-card border-r font-semibold w-20 text-center">
                                                Floor
                                            </TableHead>
                                            {matrixData.positions.map((position) => (
                                                <TableHead
                                                    key={position}
                                                    className="text-center font-semibold min-w-22.5 max-w-27.5 px-2"
                                                >
                                                    №{position}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {matrixData.floors.map((floor) => (
                                            <TableRow key={floor.id} className="hover:bg-transparent">
                                                <TableCell className="sticky left-0 z-10 bg-card border-r font-medium text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm">{floor.number}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                              {floor.units.length}u
                            </span>
                                                    </div>
                                                </TableCell>
                                                {matrixData.positions.map((position) => {
                                                    const unit = getUnitAt(floor, position);

                                                    if (!unit) {
                                                        return (
                                                            <TableCell key={`${floor.id}-${position}`} className="text-center p-1">
                                                                <div className="h-14 border border-dashed border-gray-200 rounded-md" />
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell key={`${floor.id}-${position}`} className="text-center p-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            onClick={() => setSelectedUnit(unit)}
                                                                            className={cn(
                                                                                "w-full h-14 rounded-md border-2 flex flex-col items-center justify-center transition-all cursor-pointer",
                                                                                STATUS_CELL_STYLES[unit.status],
                                                                                selectedUnit?.id === unit.id && "ring-2 ring-primary ring-offset-1"
                                                                            )}
                                                                        >
                                      <span className="text-[10px] font-bold">
                                        {unit.rooms ? `${unit.rooms}r` : UNIT_TYPE_LABELS[unit.type]}
                                      </span>
                                                                            <span className="text-[10px]">
                                        {parseFloat(unit.area).toFixed(0)}m²
                                      </span>
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="p-3">
                                                                        <div className="space-y-1.5">
                                                                            <p className="font-semibold">
                                                                                №{unit.number} • Floor {floor.number}
                                                                            </p>
                                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                                                <span className="text-muted-foreground">Type:</span>
                                                                                <span>{UNIT_TYPE_LABELS[unit.type]}</span>
                                                                                {unit.rooms && (
                                                                                    <>
                                                                                        <span className="text-muted-foreground">Rooms:</span>
                                                                                        <span>{unit.rooms}</span>
                                                                                    </>
                                                                                )}
                                                                                <span className="text-muted-foreground">Area:</span>
                                                                                <span>{parseFloat(unit.area).toFixed(1)} m²</span>
                                                                                <span className="text-muted-foreground">Price:</span>
                                                                                <span className="font-medium">
                                          ${parseFloat(unit.price).toLocaleString('en-US')}
                                        </span>
                                                                                <span className="text-muted-foreground">Status:</span>
                                                                                <span>{UNIT_STATUS_LABELS[unit.status]}</span>
                                                                            </div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                    <p>No units found in this entrance</p>
                </div>
            )}

            {/* Unit Detail Sheet */}
            {selectedUnit && !editingUnit && (
                <Sheet open={!!selectedUnit} onOpenChange={(open) => !open && setSelectedUnit(null)}>
                    <SheetContent className="sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle>
                                {UNIT_TYPE_LABELS[selectedUnit.type]} №{selectedUnit.number}
                            </SheetTitle>
                        </SheetHeader>
                        <div className="space-y-6 py-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge className={cn(
                                        selectedUnit.status === "AVAILABLE" && "bg-emerald-100 text-emerald-700",
                                        selectedUnit.status === "BOOKED" && "bg-amber-100 text-amber-700",
                                        selectedUnit.status === "SOLD" && "bg-red-100 text-red-700"
                                    )}>
                                        {UNIT_STATUS_LABELS[selectedUnit.status]}
                                    </Badge>
                                </div>
                                {selectedUnit.rooms && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Rooms</span>
                                        <span className="text-sm font-medium">{selectedUnit.rooms}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Area</span>
                                    <span className="text-sm font-medium">{parseFloat(selectedUnit.area).toFixed(1)} m²</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Price</span>
                                    <span className="text-sm font-semibold">
                    ${parseFloat(selectedUnit.price).toLocaleString('en-US')}
                  </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setEditingUnit(selectedUnit)}>
                                    Edit
                                </Button>
                                {selectedUnit.status === "AVAILABLE" && (
                                    <Button className="flex-1">Book</Button>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            {/* Edit Unit Sheet */}
            {editingUnit && (
                <Sheet open={!!editingUnit} onOpenChange={(open) => !open && setEditingUnit(null)}>
                    <SheetContent className="sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle>Edit Unit №{editingUnit.number}</SheetTitle>
                        </SheetHeader>
                        <UnitForm
                            key={`unit-${editingUnit.id}`}
                            unit={editingUnit}
                            errorMessage={updateUnitMutation.isError ? "Failed to save unit" : undefined}
                            isSubmitting={updateUnitMutation.isPending}
                            submitLabel="Save changes"
                            onCancel={() => setEditingUnit(null)}
                            onSubmit={(payload) => {
                                updateUnitMutation.mutate({ unitId: editingUnit.id, payload });
                            }}
                        />
                    </SheetContent>
                </Sheet>
            )}
        </div>
    );
}