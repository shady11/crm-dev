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
import type {Lead} from "@/features/leads/api/leads.api.ts";

interface DeleteLeadDialogProps {
    lead: Lead | null;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteLeadDialog({ lead, isDeleting, onCancel, onConfirm }: DeleteLeadDialogProps) {
    return (
        <AlertDialog open={!!lead} onOpenChange={({ open }) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete {lead?.fullName ?? "this lead"}. This action cannot be undone.
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
