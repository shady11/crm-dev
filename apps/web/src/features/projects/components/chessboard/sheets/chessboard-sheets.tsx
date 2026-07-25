import {EditUnitSheet} from "@/features/units/components/edit-unit-sheet";
import type {UpdateUnitPayload} from "@/features/units/types/unit-payload";
import {UnitDetailsSheet} from "@/features/units/components/unit-details-sheet.tsx";
import type {ChessboardSheet} from "@/features/projects/types/chessboard-sheet.types.ts";
import {BookUnitSheet} from "@/features/deals/components/book-unit-sheet";

interface ChessboardSheetsProps {
    sheet: ChessboardSheet;

    projectId: string;
    managers: { id: string; fullName: string }[];

    updateState: {
        isSubmitting: boolean;
        errorMessage?: string;
    };

    actions: {
        close(): void;
        edit(): void;
        book(): void;
        update(payload: UpdateUnitPayload): void;
    };
}

export function ChessboardSheets({
                                     sheet,
                                     projectId,
                                     managers,
                                     updateState,
                                     actions,
                                 }: ChessboardSheetsProps) {

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            actions.close();
        }
    };

    switch (sheet.type) {
        case "details":
            return (
                <UnitDetailsSheet
                    unit={sheet.unit}
                    floor={sheet.floor}
                    open
                    onOpenChange={handleOpenChange}
                    onEdit={actions.edit}
                    onBook={actions.book}
                />
            );

        case "edit":
            return (
                <EditUnitSheet
                    unit={sheet.unit}
                    open
                    isSubmitting={updateState.isSubmitting}
                    errorMessage={updateState.errorMessage}
                    onOpenChange={handleOpenChange}
                    onSubmit={actions.update}
                />
            );

        case "booking":
            return (
                <BookUnitSheet
                    unit={sheet.unit}
                    floor={sheet.floor}
                    projectId={projectId}
                    managers={managers}
                    open
                    onOpenChange={handleOpenChange}
                />
            );

        default:
            return null;
    }
}