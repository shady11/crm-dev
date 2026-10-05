import keregeLogoLight from "@/assets/logo/kerege-logo-light.png";
import keregeLogoDark from "@/assets/logo/kerege-logo-dark.png";
import {cn} from "@/lib/utils";

// Full wordmark. Paper is always white, so print uses the light-theme logo
// even when the screen is in dark mode.
export function KeregeLogo({className}: {className?: string}) {
    return (
        <>
            <img src={keregeLogoLight} alt="Kerege" className={cn("w-auto dark:hidden print:block", className)} />
            <img src={keregeLogoDark} alt="Kerege" className={cn("hidden w-auto dark:block print:hidden", className)} />
        </>
    );
}

// The lattice symbol alone, for spots too small for the wordmark (e.g. the
// collapsed sidebar). Drawn as SVG so it stays crisp at any size.
export function KeregeMark({className}: {className?: string}) {
    return (
        <svg
            viewBox="-150 -150 300 300"
            aria-label="Kerege"
            role="img"
            className={cn("text-[#4b5fd8] dark:text-[#7f8ceb]", className)}
        >
            <g stroke="currentColor" strokeWidth="24" strokeLinecap="round" fill="none">
                <line x1="-77" y1="-137" x2="137" y2="77" />
                <line x1="-137" y1="-77" x2="77" y2="137" />
                <line x1="77" y1="-137" x2="-137" y2="77" />
                <line x1="137" y1="-77" x2="-77" y2="137" />
            </g>
        </svg>
    );
}
