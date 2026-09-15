import {useMemo} from "react";
import {Checkbox} from "@/components/ui/checkbox";
import type {Permission} from "../types/rbac.types";

/**
 * Grouped by module (leads, deals, ...) so a form with 50+ permissions stays
 * scannable — matches how RbacController's catalog is organized server-side.
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

    const toggleModule = (modulePermissions: Permission[], allSelected: boolean) => {
        const next = new Set(selected);
        for (const p of modulePermissions) {
            if (allSelected) next.delete(p.key);
            else next.add(p.key);
        }
        onChange(next);
    };

    return (
        <div className="space-y-4">
            {grouped.map(([module, modulePermissions]) => {
                const allSelected = modulePermissions.every((p) => selected.has(p.key));

                return (
                    <div key={module} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                            <Checkbox
                                checked={allSelected}
                                disabled={disabled}
                                onCheckedChange={() => toggleModule(modulePermissions, allSelected)}
                            />
                            <span className="text-sm font-medium capitalize">{module.replace(/_/g, " ")}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-2">
                            {modulePermissions.map((permission) => (
                                <label
                                    key={permission.key}
                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                >
                                    <Checkbox
                                        checked={selected.has(permission.key)}
                                        disabled={disabled}
                                        onCheckedChange={() => toggle(permission.key)}
                                    />
                                    <span>{permission.description}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
