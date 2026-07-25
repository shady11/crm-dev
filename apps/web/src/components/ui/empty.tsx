"use client";

import {ark} from "@ark-ui/react/factory";
import type * as React from "react";
import {cn} from "@/lib/utils";

export const Empty = (props: React.ComponentProps<typeof ark.div>) => {
    const { className, ...rest } = props;

    return (
        <ark.div
            className={cn(
                "flex min-h-80 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted p-8",
                className
            )}
            data-slot="empty"
            {...rest}
        />
    );
};

export const EmptyHeader = (props: React.ComponentProps<typeof ark.div>) => {
    const { className, ...rest } = props;

    return (
        <ark.div
            className={cn(
                "mx-auto flex max-w-md flex-col items-center text-center",
                className
            )}
            data-slot="empty-header"
            {...rest}
        />
    );
};

interface EmptyMediaProps extends React.ComponentProps<typeof ark.div> {
    variant?: "icon" | "image";
}

export const EmptyMedia = (props: EmptyMediaProps) => {
    const { className, variant = "icon", ...rest } = props;

    return (
        <ark.div
            className={cn(
                variant === "icon" && [
                    "mb-5",
                    "flex size-14 items-center justify-center",
                    "rounded-full border",
                    "text-muted-foreground",
                    "[&_svg]:size-7",
                ],
                variant === "image" && "mb-6",
                className
            )}
            data-slot="empty-media"
            {...rest}
        />
    );
};

export const EmptyTitle = (props: React.ComponentProps<typeof ark.h3>) => {
    const { className, ...rest } = props;

    return (
        <ark.h3
            className={cn(
                "text-lg font-medium tracking-tight",
                className
            )}
            data-slot="empty-title"
            {...rest}
        />
    );
};

export const EmptyDescription = (
    props: React.ComponentProps<typeof ark.p>
) => {
    const { className, ...rest } = props;

    return (
        <ark.p
            className={cn(
                "mt-2 text-sm leading-6 text-muted-foreground",
                className
            )}
            data-slot="empty-description"
            {...rest}
        />
    );
};

export const EmptyContent = (props: React.ComponentProps<typeof ark.div>) => {
    const { className, ...rest } = props;

    return (
        <ark.div
            className={cn(
                "mt-6 flex flex-wrap items-center justify-center gap-3",
                className
            )}
            data-slot="empty-content"
            {...rest}
        />
    );
};