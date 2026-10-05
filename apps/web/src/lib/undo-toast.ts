import i18n from "@/lib/i18n";
import {toast} from "@/components/ui/toast.tsx";

// Long enough to read the toast and reach the button, short enough that the
// stack doesn't fill up with stale offers.
export const UNDO_TOAST_DURATION = 8000;

type UndoToastOptions = {
    title: string;
    description?: string;
    /** Reverses the action server-side. */
    undo: () => Promise<unknown>;
    /** Runs after a successful undo — typically a query invalidation. */
    onUndone?: () => unknown;
};

/**
 * Success toast with an "Undo" button, for actions that are easy to trigger
 * by mistake and cheap to reverse (soft deletes, status moves, reassignments).
 * The button fires at most once; a failed undo is reported, never retried.
 */
export function toastWithUndo({title, description, undo, onUndone}: UndoToastOptions) {
    let used = false;

    toast.success({
        title,
        description,
        duration: UNDO_TOAST_DURATION,
        action: {
            label: i18n.t("undo.action", {ns: "common"}),
            onClick: async () => {
                if (used) return;
                used = true;

                try {
                    await undo();
                    await onUndone?.();
                    toast.success({title: i18n.t("undo.success", {ns: "common"})});
                } catch {
                    await onUndone?.();
                    toast.error({
                        title: i18n.t("undo.errorTitle", {ns: "common"}),
                        description: i18n.t("undo.errorDescription", {ns: "common"}),
                    });
                }
            },
        },
    });
}
