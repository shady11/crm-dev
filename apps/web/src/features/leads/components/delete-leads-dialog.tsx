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

interface DeleteLeadsDialogProps {
    open: boolean;
    count: number;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteLeadsDialog({ open, count, isDeleting, onCancel, onConfirm }: DeleteLeadsDialogProps) {
    const noun = count === 1 ? "lead" : "leads";

    return (
        <AlertDialog open={open} onOpenChange={({ open: isOpen }) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {count} {noun}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the selected {noun}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
