import {type ReactNode, useLayoutEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {cn} from "@/lib/utils";

type PillBox = {top: number; left: number; width: number; height: number};

const ACTIVE_ITEM = "[data-sidebar=menu-button][data-active=true]";

/**
 * One frosted pill behind the whole menu that slides to the active item when
 * the page changes, as in the reference design. The items themselves keep
 * their active text and icon colours; only their own background is hidden
 * here, so the pill shows through. With no active item (e.g. the profile
 * page) the pill fades out.
 */
export function NavActivePill({children}: {children: ReactNode}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const {pathname} = useLocation();
    const [box, setBox] = useState<PillBox | null>(null);
    // The first placement shouldn't animate in from the top-left corner.
    const [ready, setReady] = useState(false);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const measure = () => {
            const item = container.querySelector<HTMLElement>(ACTIVE_ITEM);
            if (!item) {
                setBox(null);
                return;
            }
            const c = container.getBoundingClientRect();
            const r = item.getBoundingClientRect();
            setBox({top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height});
        };

        measure();
        // Re-measure when the sidebar collapses or expands, or labels reflow.
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        container.querySelectorAll("[data-sidebar=menu-button]").forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [pathname]);

    useLayoutEffect(() => {
        if (box && !ready) {
            const id = requestAnimationFrame(() => setReady(true));
            return () => cancelAnimationFrame(id);
        }
    }, [box, ready]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative isolate",
                // The pill replaces the active item's own background.
                "[&_[data-sidebar=menu-button][data-active=true]]:bg-transparent [&_[data-sidebar=menu-button][data-active=true]]:shadow-none",
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute -z-1 rounded-[9px] seg-thumb",
                    ready && "transition-[top,left,width,height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "motion-reduce:transition-none",
                    box ? "opacity-100" : "opacity-0",
                )}
                style={box ?? undefined}
            />
            {children}
        </div>
    );
}
