import type {Floor} from "@/features/floors/types/floor.types.ts";
import type {Unit} from "@/features/units/types/unit.types.ts";

/**
 * Represents the currently active sheet in the chessboard.
 *
 * Only one sheet can be active at a time.
 */
export type ChessboardSheet =
    | {
    type: "none";
}
    | {
    type: "details";
    unit: Unit;
    floor: Floor;
}
    | {
    type: "edit";
    unit: Unit;
}
    | {
    type: "booking";
    unit: Unit;
    floor: Floor;
};

/**
 * Helper types.
 */

export type DetailsSheet = Extract<
    ChessboardSheet,
    { type: "details" }
>;

export type EditSheet = Extract<
    ChessboardSheet,
    { type: "edit" }
>;

export type BookingSheet = Extract<
    ChessboardSheet,
    { type: "booking" }
>;

/**
 * Type guards.
 */

export const isDetailsSheet = (
    sheet: ChessboardSheet,
): sheet is DetailsSheet => sheet.type === "details";

export const isEditSheet = (
    sheet: ChessboardSheet,
): sheet is EditSheet => sheet.type === "edit";

export const isBookingSheet = (
    sheet: ChessboardSheet,
): sheet is BookingSheet => sheet.type === "booking";