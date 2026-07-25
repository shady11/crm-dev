import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {UserForm} from "@/features/users/components/user-form.tsx";
import type {CreateUserPayload, UpdateUserPayload} from "@/features/users/api/users.api.ts";
import type {User} from "@/features/users/types/user.types";

interface UserFormSheetProps {
    open: boolean;
    user: User | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: CreateUserPayload | UpdateUserPayload): void;
}

export function UserFormSheet({ open, user, isSubmitting, hasError, onClose, onSubmit }: UserFormSheetProps) {
    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{user ? "Edit user" : "Add user"}</SheetTitle>
                    <SheetDescription>
                        {user ? "Update the team member's details." : "Invite a new team member."}
                    </SheetDescription>
                </SheetHeader>
                <UserForm
                    key={`${user?.id ?? "create-user"}-${open ? "open" : "closed"}`}
                    user={user}
                    errorMessage={
                        hasError ? "User could not be saved. Check the details and try again." : undefined
                    }
                    isSubmitting={isSubmitting}
                    submitLabel={user ? "Save changes" : "Create user"}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}