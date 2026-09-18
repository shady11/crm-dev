import {useMemo} from "react";
import {Check} from "lucide-react";
import {cn} from "@/lib/utils";
import type {Permission} from "../types/rbac.types";

/**
 * One row per module (leads, deals, ...), a pill toggle per permission in
 * that module — mirrors the Read/Write/Delete segmented-button pattern from
 * the design reference, generalized to however many actions a module
 * actually has (not every module is a fixed three).
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
    const grouped = useMemo(() => {
        const byModule = new Map<string, Permission[]>();
        for (const permission of permissions) {
            const list = byModule.get(permission.module) ?? [];
            list.push(permission);
            byModule.set(permission.module, list);
        }
        return Array.from(byModule.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [permissions]);

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
                    <span className="text-sm font-medium capitalize">{module.replace(/_/g, " ")}</span>
                    <div className="flex flex-wrap gap-2">
                        {modulePermissions.map((permission) => {
                            const isSelected = selected.has(permission.key);

                            return (
                                <button
                                    key={permission.key}
                                    type="button"
                                    disabled={disabled}
                                    title={permission.description}
                                    aria-pressed={isSelected}
                                    onClick={() => toggle(permission.key)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                                        "disabled:pointer-events-none disabled:opacity-64",
                                        isSelected
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-input text-muted-foreground hover:bg-accent",
                                    )}
                                >
                                    {isSelected && <Check className="size-3" />}
                                    {permission.action.replace(/_/g, " ")}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
