import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {UserForm} from "@/features/users/components/user-form.tsx";
import type {CreateUserPayload, UpdateUserPayload} from "@/features/users/api/users.api.ts";
import type {User} from "@/features/users/types/user.types";
import {useTranslation} from "react-i18next";

interface UserFormSheetProps {
    open: boolean;
    user: User | null;
    isSubmitting: boolean;
    /** Why the last save failed, shown above the buttons. */
    formError?: string;
    onClose(): void;
    onSubmit(payload: CreateUserPayload | UpdateUserPayload): void;
}

export function UserFormSheet({ open, user, isSubmitting, formError, onClose, onSubmit }: UserFormSheetProps) {
    const { t } = useTranslation("users");
    const { t: tCommon } = useTranslation("common");

    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{user ? t("formSheet.editTitle") : t("formSheet.addTitle")}</SheetTitle>
                    <SheetDescription>
                        {user ? t("formSheet.editDescription") : t("formSheet.addDescription")}
                    </SheetDescription>
                </SheetHeader>
                <UserForm
                    key={`${user?.id ?? "create-user"}-${open ? "open" : "closed"}`}
                    user={user}
                    errorMessage={formError}
                    isSubmitting={isSubmitting}
                    submitLabel={user ? tCommon("actions.saveChanges") : t("form.submit.createUser")}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}