import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {Check} from "lucide-react";
import {cn} from "@/lib/utils";
import type {Permission} from "../types/rbac.types";

/**
 * One row per module (leads, deals, ...), a pill toggle per permission in
 * that module — mirrors the Read/Write/Delete segmented-button pattern from
 * the design reference, generalized to however many actions a module
 * actually has (not every module is a fixed three). Names and descriptions
 * come from the reader's language (CA-10), falling back to the API's
 * English description for a permission this build doesn't know yet.
 */
export function PermissionPicker({
    permissions,
    selected,
    onChange,
    disabled,
}: {
    permissions: Permission[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    disabled?: boolean;
}) {
    const {t, i18n} = useTranslation("rbac");
    const moduleLabel = (module: string) =>
        t(`catalog.modules.${module}`, {defaultValue: module.replace(/_/g, " ")});
    const permissionText = (permission: Permission) => ({
        label: t(`catalog.permissions.${permission.module}.${permission.action}.label`, {defaultValue: permission.action.replace(/_/g, " ")}),
        description: t(`catalog.permissions.${permission.module}.${permission.action}.description`, {defaultValue: permission.description}),
    });

    const grouped = useMemo(() => {
        const byModule = new Map<string, Permission[]>();
        for (const permission of permissions) {
            const list = byModule.get(permission.module) ?? [];
            list.push(permission);
            byModule.set(permission.module, list);
        }
        return Array.from(byModule.entries())
            .sort(([a], [b]) => moduleLabel(a).localeCompare(moduleLabel(b), i18n.language));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- moduleLabel follows the language
    }, [permissions, i18n.language]);

    const toggle = (key: string) => {
        const next = new Set(selected);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onChange(next);
    };

    return (
        <div className="divide-y rounded-lg border">
            {grouped.map(([module, modulePermissions]) => (
                <div
                    key={module}
                    className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    <span className="text-sm font-medium sm:shrink-0">{moduleLabel(module)}</span>
                    {/* Right-aligned on wider screens, wrapped lines included. */}
                    <div className="flex min-w-0 flex-wrap gap-2 sm:flex-1 sm:justify-end">
                        {modulePermissions.map((permission) => {
                            const isSelected = selected.has(permission.key);
                            const text = permissionText(permission);

                            return (
                                <button
                                    key={permission.key}
                                    type="button"
                                    disabled={disabled}
                                    title={text.description}
                                    aria-description={text.description}
                                    aria-pressed={isSelected}
                                    onClick={() => toggle(permission.key)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                        "disabled:pointer-events-none disabled:opacity-64",
                                        isSelected
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-input text-muted-foreground hover:bg-accent",
                                    )}
                                >
                                    {isSelected && <Check className="size-3" />}
                                    {text.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
