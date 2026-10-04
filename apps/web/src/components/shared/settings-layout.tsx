import type {ReactNode} from "react";
import type {LucideIcon} from "lucide-react";
import {Card} from "@/components/ui/card.tsx";
import {cn} from "@/lib/utils";

export type SettingsSectionItem<T extends string> = {id: T; label: string; icon: LucideIcon};

type SettingsLayoutProps<T extends string> = {
    sections: SettingsSectionItem<T>[];
    activeSection: T;
    onSelect: (section: T) => void;
    children: ReactNode;
};

/** Section menu beside a content card — shared by the settings and profile pages. */
export function SettingsLayout<T extends string>({sections, activeSection, onSelect, children}: SettingsLayoutProps<T>) {
    return (
        <div className="grid max-w-5xl items-start gap-6 md:grid-cols-[220px_1fr]">
            <Card className="p-2 py-2">
                <nav className="flex gap-1 overflow-x-auto md:flex-col">
                    {sections.map(({id, label, icon: Icon}) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSelect(id)}
                            aria-current={activeSection === id ? "page" : undefined}
                            className={cn(
                                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                                activeSection === id
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            </Card>

            <Card className="px-6">{children}</Card>
        </div>
    );
}

export function SettingsSectionHeader({title, description}: {title: string; description?: string}) {
    return (
        <div className="border-b pb-4">
            <h3 className="text-base font-semibold">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
    );
}
