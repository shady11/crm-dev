"use client";

import { Field as ArkField } from "@ark-ui/react/field";
import type React from "react";
import { cn } from "@/lib/utils";

export const Textarea = (
  props: React.ComponentProps<typeof ArkField.Textarea>
) => {
  const { className, ...rest } = props;

  return (
    <ArkField.Textarea
      className={cn(
        "field-sizing-content min-h-16 w-full",
        "flex",
        "px-3 py-2",
        "field-surface",
        "text-base md:text-sm",
        "rounded-lg border",
        "placeholder:text-muted-foreground/64",
        "transition-[color,box-shadow]",
        "outline-none focus-visible:field-focus",
        "aria-invalid:field-invalid aria-invalid:text-destructive data-invalid:field-invalid data-invalid:text-destructive",
        "dark:aria-invalid:text-destructive-foreground dark:data-invalid:text-destructive-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-64",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="textarea"
      {...rest}
    />
  );
};
