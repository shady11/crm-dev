"use client";

import React from "react";
import {
  Legend,
  type LegendPayload,
  type LegendProps,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  type TooltipPayloadEntry,
  type TooltipValueType,
} from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { dark: ".dark", light: "" } as const;

export type ChartConfig = Record<
  string,
  (
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
    | { color?: string; theme?: never }
  ) & {
    icon?: React.ComponentType;
    label?: React.ReactNode;
  }
>;

export interface ChartLegendContentProps {
  className?: string;
  hideIcon?: boolean;
  nameKey?: string;
  payload?: LegendPayload[];
  verticalAlign?: LegendProps["verticalAlign"];
}

export type CustomTooltipProps = Partial<
  TooltipContentProps<TooltipValueType, NameType>
> & {
  className?: string;
  color?: string;
  formatter?: Formatter;
  hideIndicator?: boolean;
  hideLabel?: boolean;
  indicator?: "dashed" | "dot" | "line";
  labelClassName?: string;
  labelFormatter?: (
    label: TooltipContentProps<number, string>["label"],
    payload: TooltipContentProps<number, string>["payload"]
  ) => React.ReactNode;
  labelKey?: string;
  nameKey?: string;
};

export type Formatter<
  TValue extends TooltipValueType = TooltipValueType,
  TName extends NameType = NameType,
> = (
  value: TValue | undefined,
  name: TName | undefined,
  item: TooltipPayloadEntry<TValue, TName>,
  index: number,
  payload: readonly TooltipPayloadEntry<TValue, TName>[]
) => [React.ReactNode, TName] | React.ReactNode;

export type NameType = number | string;

export type TooltipType = "none";

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

interface ChartContainerProps extends React.ComponentProps<"div"> {
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
  config: ChartConfig;
}

export const ChartContainer = (props: ChartContainerProps) => {
  const { children, className, config, id, ...rest } = props;

  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "flex justify-center",
          "aspect-video",
          "text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-axis-tick_text]:text-[11px]",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-foreground/10 [&_.recharts-cartesian-grid_line]:[stroke-dasharray:3_5]",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-hidden",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-foreground/5",
          "[&_.recharts-label-list_text]:fill-muted-foreground [&_.recharts-label-list_text]:font-medium",
          className
        )}
        data-chart={chartId}
        data-slot="chart"
        {...rest}
      >
        <ChartStyle config={config} id={chartId} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

export const ChartStyle = ({
  config,
  id,
}: {
  config: ChartConfig;
  id: string;
}) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
            ${prefix} [data-chart=${id}] {
            ${colorConfig
              .map(([key, itemConfig]) => {
                const color =
                  itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
                  itemConfig.color;
                return color ? `  --color-${key}: ${color};` : null;
              })
              .join("\n")}
            }
            `
          )
          .join("\n"),
      }}
    />
  );
};

export const ChartTooltip = Tooltip;

/**
 * Vertical fill for a bar or area: the series colour fading from strong at
 * the top to softer at the base. Place inside the chart's <defs> and fill
 * the mark with url(#id).
 */
export const ChartGradient = ({ id, color }: { id: string; color: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={0.95} />
    <stop offset="100%" stopColor={color} stopOpacity={0.55} />
  </linearGradient>
);

export const ChartTooltipContent = (props: CustomTooltipProps) => {
  const {
    active,
    className,
    color,
    formatter,
    hideIndicator = false,
    hideLabel = false,
    indicator = "dot",
    label,
    labelClassName,
    labelFormatter,
    labelKey,
    nameKey,
    payload,
  } = props;

  const { config } = _useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayload(config, item, key);
    const value = (() => {
      const v =
        !labelKey && typeof label === "string"
          ? (config[label as keyof typeof config]?.label ?? label)
          : itemConfig?.label;

      return typeof v === "string" || typeof v === "number" ? v : undefined;
    })();

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!(active && payload?.length)) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "min-w-32",
        "grid items-start gap-1.5",
        "px-2.5 py-1.5",
        "bg-popover/85 backdrop-blur-xl",
        "text-xs",
        "rounded-xl border border-glass-border shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]",
        className
      )}
    >
      {nestLabel ? null : tooltipLabel}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayload(config, item, key);
          const indicatorColor = color || item.payload.fill || item.color;

          return (
            <div
              className={cn(
                "w-full",
                "flex flex-wrap items-stretch gap-2",
                "[&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}
              key={key}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-border bg-(--color-bg)",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "my-0.5": nestLabel && indicator === "dashed",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "w-1": indicator === "line",
                          }
                        )}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between gap-4 leading-none",
                      nestLabel ? "items-end" : "items-center"
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className="font-medium font-mono text-foreground tabular-nums">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ChartLegend = Legend;

export const ChartLegendContent = (props: ChartLegendContentProps) => {
  const {
    className,
    hideIcon = false,
    nameKey,
    payload,
    verticalAlign = "bottom",
  } = props;

  const { config } = _useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayload(config, item, key);

        return (
          <div
            className={cn(
              "flex items-center gap-1.5",
              "[&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
            key={item.value}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="size-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
};

const getPayload = (config: ChartConfig, payload: unknown, key: string) => {
  if (typeof payload !== "object" || payload === null) {
    return;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
};

export const _useChart = () => {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
};
