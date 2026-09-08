import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet.tsx";
import {FieldGroup} from "@/components/ui/field.tsx";
import type {CreateSettingOptionPayload} from "../api/setting-options.api";
import type {SettingOption, SettingOptionType} from "../types/setting-option.types";

type Props = {
    open: boolean;
    type: SettingOptionType;
    /** null = create. An option = edit; code becomes read-only then. */
    option: SettingOption | null;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onSubmit(payload: CreateSettingOptionPayload): void;
};

export function SettingOptionFormSheet({open, type, option, isSubmitting, onOpenChange, onSubmit}: Props) {
    const {t} = useTranslation("settingOptions");
    const {t: tCommon} = useTranslation("common");
    const [code, setCode] = useState("");
    const [label, setLabel] = useState("");

    useEffect(() => {
        if (!open) return;
        setCode(option?.code ?? "");
        setLabel(option?.label ?? "");
    }, [open, option]);

    const isEdit = option !== null;

    return (
        <Sheet open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-sm" variant="inset">
                <SheetHeader>
                    <SheetTitle>{isEdit ? t("form.editTitle") : t("form.newTitle", {type: t(`types.${type}`)})}</SheetTitle>
                    <SheetDescription>{t("form.description")}</SheetDescription>
                </SheetHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit({type, code, label});
                    }}
                >
                    <SheetBody scrollFade>
                        <FieldGroup className="gap-5 py-4">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("form.fields.code")}</span>
                                <Input
                                    aria-label={t("form.fields.code")}
                                    required
                                    disabled={isEdit}
                                    placeholder={t(`form.codePlaceholders.${type}`)}
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                />
                                <span className="text-muted-foreground block text-xs">
                                    {t(`form.codeHints.${type}`)}
                                </span>
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("form.fields.label")}</span>
                                <Input
                                    aria-label={t("form.fields.label")}
                                    required
                                    value={label}
                                    onChange={(event) => setLabel(event.target.value)}
                                />
                            </label>
                        </FieldGroup>
                    </SheetBody>

                    <SheetFooter>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting
                                ? tCommon("actions.saving")
                                : isEdit
                                  ? tCommon("actions.saveChanges")
                                  : t("form.submit.create")}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
