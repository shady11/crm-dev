"use client";

import {ark} from "@ark-ui/react/factory";
import {tv, type VariantProps} from "tailwind-variants";
import {cn} from "@/lib/utils";

export const badgeVariants = tv({
  base: [
    "relative",
    "inline-flex items-center justify-center gap-1",
    "select-none whitespace-nowrap font-semibold text-xs",
    "rounded-full border border-transparent",
    "overflow-hidden",
    "transition-colors",
    "outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/32",
    "[&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
    "[button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",
    "motion-reduce:transition-none!",
  ],
  variants: {
    variant: {
      default: [
        "bg-foreground",
        "text-background",
        "focus-visible:border-foreground focus-visible:ring-foreground/20",
        "dark:focus-visible:ring-foreground/40",
        "[a&]:hover:bg-foreground/90",
      ],
      secondary: [
        "bg-foreground/7 dark:bg-foreground/9",
        "text-foreground/80",
        "focus-visible:border-foreground focus-visible:ring-foreground/50",
        "[a&]:hover:bg-secondary/90",
      ],
      outline: [
        "text-foreground",
        "border-border",
        "[a&]:hover:bg-accent",
        "[a&]:hover:text-accent-foreground",
      ],
      success: [
        "bg-success/13",
        "text-success-foreground",
        "focus-visible:border-success focus-visible:ring-success/20",
        "[a&]:hover:bg-success/20",
      ],
      info: [
        "bg-info/12",
        "text-info-foreground",
        "focus-visible:border-info focus-visible:ring-info/50",
        "[a&]:hover:bg-info/20",
      ],
      warning: [
        "bg-warning/18 dark:bg-warning/15",
        "text-warning-foreground",
        "focus-visible:border-warning focus-visible:ring-warning/20",
        "dark:focus-visible:ring-warning/40",
        "[a&]:hover:bg-warning/20",
      ],
      destructive: [
        "bg-destructive/11 dark:bg-destructive/14",
        "text-destructive-foreground",
        "focus-visible:border-destructive focus-visible:ring-destructive/24",
        "dark:focus-visible:ring-destructive/40",
        "[a&]:hover:bg-destructive/20",
      ],
    },
    size: {
      xs: ["h-4 min-w-4", "px-1.5 text-xs"],
      sm: ["h-5 min-w-5", "px-1"],
      md: ["h-5 min-w-5", "px-2"],
      lg: ["h-6.5 min-w-6.5", "px-2", "text-sm"],
    },
    pill: {
      true: [
        "rounded-full",
        "has-[>svg]:data-[size=sm]:pe-1.5",
        "has-[>svg]:data-[size=md]:pe-2",
        "has-[>svg]:data-[size=lg]:pe-2 sm:has-[>svg]:data-[size=lg]:pe-2.5",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    pill: false,
  },
});

// Status badges are coloured by passing a solid colour class (e.g.
// "bg-amber-400", shared with the icon tiles). Here that becomes a soft
// pill in the same hue: tinted fill, deeper text, and a leading dot.
// Neutral greys get the plain pill without a dot.
const TONES: Record<string, string> = {
  amber: "bg-amber-500/18 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  orange: "bg-orange-500/15 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  rose: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  emerald: "bg-emerald-600/13 text-emerald-700 dark:bg-emerald-400/14 dark:text-emerald-300",
  blue: "bg-blue-600/12 text-blue-700 dark:bg-blue-400/14 dark:text-blue-300",
  cyan: "bg-cyan-600/13 text-cyan-700 dark:bg-cyan-400/14 dark:text-cyan-300",
  indigo: "bg-indigo-600/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  violet: "bg-violet-600/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
};
const NEUTRAL_TONE = "bg-foreground/7 text-foreground/80 dark:bg-foreground/9";
const SOLID_BG = /(?:^|\s)bg-(amber|orange|rose|emerald|blue|cyan|indigo|violet|gray|slate)-\d{3}(?=\s|$)/;

function toneFor(className?: string) {
  const hue = className?.match(SOLID_BG)?.[1];
  if (!hue) return null;
  const rest = className!
    .replace(SOLID_BG, " ")
    .replace(/(?:^|\s)text-white(?=\s|$)/g, " ")
    .trim();
  const neutral = hue === "gray" || hue === "slate";
  return { tone: neutral ? NEUTRAL_TONE : TONES[hue], dot: !neutral, rest };
}

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface BadgeProps
  extends React.ComponentProps<typeof ark.span>,
    VariantProps<typeof badgeVariants> {}

export const Badge = (props: BadgeProps) => {
  const {
    variant = "default",
    size = "md",
    pill = false,
    className,
    children,
    ...rest
  } = props;

  const tone = toneFor(className);

  return (
    <ark.span
      className={cn(
        badgeVariants({ variant, size, pill }),
        tone && ["gap-1.5", tone.tone, tone.dot && "ps-1.5"],
        tone ? tone.rest : className
      )}
      data-size={size}
      data-slot="badge"
      data-variant={variant}
      {...rest}
    >
      {tone?.dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </ark.span>
  );
};
