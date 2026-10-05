import keregeLogoLight from "@/assets/logo/kerege-logo-light.png";
import keregeLogoDark from "@/assets/logo/kerege-logo-dark.png";
import keregeMarkLight from "@/assets/logo/kerege-mark-light.png";
import keregeMarkDark from "@/assets/logo/kerege-mark-dark.png";
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
// collapsed sidebar). Blue on light backgrounds, white on dark.
export function KeregeMark({className}: {className?: string}) {
    return (
        <>
            <img src={keregeMarkLight} alt="Kerege" className={cn("dark:hidden print:block", className)} />
            <img src={keregeMarkDark} alt="Kerege" className={cn("hidden dark:block print:hidden", className)} />
        </>
    );
}
