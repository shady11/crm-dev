import type {ReactNode} from "react";
import {ListFilterIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";

interface FilterPopoverProps {
    /** How many filters differ from their default; shown as a badge on the button. */
    activeCount: number;
    /** Puts every filter back to its default. The Reset button is hidden without it. */
    onReset?(): void;
    /** The filter controls, unchanged; they are stacked full width in the panel. */
    children: ReactNode;
}

/**
 * One "Filters" button that opens a panel holding a toolbar's dropdown
 * filters, so a list page shows search and the button instead of a wrapping
 * row of six to ten selects. The filters themselves are passed in as they
 * are, so they keep their own values and handlers.
 */
export function FilterPopover({activeCount, onReset, children}: FilterPopoverProps) {
    const {t} = useTranslation("common");

    return (
        // Not modal, so a select opened inside the panel doesn't fight it for focus.
        <Popover modal={false} positioning={{placement: "bottom-end"}}>
            <PopoverTrigger asChild>
                <Button variant="outline" aria-label={t("filters.title")}>
                    <ListFilterIcon className="size-4" />
                    {t("filters.title")}
                    {activeCount > 0 && (
                        <span className="ms-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(21rem,calc(100vw-2rem))]">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <span className="text-sm font-semibold">{t("filters.title")}</span>
                    {onReset && activeCount > 0 && (
                        <Button variant="ghost" size="xs" onClick={onReset}>
                            {t("filters.reset")}
                        </Button>
                    )}
                </div>
                {/* Each filter fills the panel width, whatever width it had in the toolbar. */}
                <div className="flex flex-col gap-2.5 p-4 *:w-full [&_[data-slot=select-control]]:w-full [&_[data-slot=select-trigger]]:w-full [&_[data-slot=input-group]]:w-full">
                    {children}
                </div>
            </PopoverContent>
        </Popover>
    );
}
