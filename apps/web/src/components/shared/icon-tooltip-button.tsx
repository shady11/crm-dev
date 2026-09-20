import type {ComponentProps} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";

interface IconTooltipButtonProps extends ComponentProps<typeof Button> {
    label: string;
}

// Icon-only button paired with a visible tooltip, so the action is
// discoverable for sighted mouse users too, not just screen readers via
// aria-label alone.
export function IconTooltipButton({ label, ...props }: IconTooltipButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button aria-label={label} {...props} />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
