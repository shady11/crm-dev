import {useCallback, useState} from "react";

import type {Floor} from "@/features/floors/types/floor.types";
import type {Unit} from "@/features/units/types/unit.types";
import type {ChessboardSheet} from "@/features/projects/types/chessboard-sheet.types.ts";

export function useChessboardSheet() {
    const [sheet, setSheet] = useState<ChessboardSheet>({
        type: "none",
    });

    const openDetails = useCallback(
        (unit: Unit, floor: Floor) => {
            setSheet({
                type: "details",
                unit,
                floor,
            });
        },
        [],
    );

    const openEdit = useCallback(
        (unit: Unit) => {
            setSheet({
                type: "edit",
                unit,
            });
        },
        [],
    );

    const openBooking = useCallback(
        (unit: Unit, floor: Floor) => {
            setSheet({
                type: "booking",
                unit,
                floor,
            });
        },
        [],
    );

    const close = useCallback(() => {
        setSheet({
            type: "none",
        });
    }, []);

    return {
        sheet,

        actions: {
            openDetails,
            openEdit,
            openBooking,
            close,
        },
    };
}