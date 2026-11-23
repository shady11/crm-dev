"use client";

import { FieldInput } from "@ark-ui/react/field";
import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";

export const inputVariants = tv({
  base: [
    "peer",
    "w-full min-w-0",
    "px-3",
    "field-surface",
    "text-base md:text-sm",
    "rounded-lg border",
    "placeholder:text-muted-foreground/64",
    "file:inline-flex file:h-7 file:items-center file:border-0",
    "file:font-medium file:text-foreground file:text-sm",
    "transition-[color,box-shadow]",
    "outline-none focus-visible:field-focus",
    "aria-invalid:field-invalid aria-invalid:text-destructive data-invalid:field-invalid data-invalid:text-destructive",
    "dark:aria-invalid:text-destructive-foreground dark:data-invalid:text-destructive-foreground",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-64",
    "motion-reduce:transition-none!",
  ],
  variants: {
    size: {
      sm: ["h-7"],
      md: ["h-8"],
      lg: ["h-9"],
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface InputProps
  extends Omit<React.ComponentProps<typeof FieldInput>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = (props: InputProps) => {
  const { size = "md", type = "text", className, ...rest } = props;

  return (
    <FieldInput
      className={cn(inputVariants({ size }), className)}
      data-size={size}
      data-slot="input"
      type={type}
      {...rest}
    />
  );
};
