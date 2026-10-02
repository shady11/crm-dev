import {DatePicker as ArkDatePicker} from "@ark-ui/react/date-picker";
import {type DateValue, getLocalTimeZone, parseDate} from "@internationalized/date";
import {CalendarIcon, XIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button.tsx";
import {DatePicker, DatePickerContent, DatePickerTrigger} from "@/components/ui/date-picker.tsx";
import {
    CalendarMonthSelect,
    CalendarNextTrigger,
    CalendarPrevTrigger,
    CalendarTable,
    CalendarTableDays,
    CalendarViewControl,
    CalendarWeekDays,
    CalendarYearSelect,
} from "@/components/ui/calendar.tsx";

interface DateFieldProps {
    /** Date as an ISO `YYYY-MM-DD` string, or empty string when unset. */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Show a button that resets the value to an empty string. */
    clearable?: boolean;
    min?: string;
    max?: string;
    disabled?: boolean;
    className?: string;
}

function toDateValue(value?: string): DateValue | undefined {
    if (!value) return undefined;
    try {
        return parseDate(value.slice(0, 10));
    } catch {
        return undefined;
    }
}

export function DateField({
    value,
    onChange,
    placeholder,
    clearable = false,
    min,
    max,
    disabled,
    className,
}: DateFieldProps) {
    const { t, i18n } = useTranslation("common");
    const dateValue = toDateValue(value);
    const label = dateValue
        ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString(i18n.language, {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : (placeholder ?? t("labels.selectDate"));
    const showClear = clearable && Boolean(dateValue) && !disabled;

    return (
        <DatePicker
            className={cn("relative w-full", className)}
            locale={i18n.language}
            positioning={{ placement: "bottom-start" }}
            value={dateValue ? [dateValue] : []}
            onValueChange={({ value: next }) => onChange(next[0] ? next[0].toString() : "")}
            min={toDateValue(min)}
            max={toDateValue(max)}
            disabled={disabled}
        >
            <DatePickerTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    <span className={cn("truncate", !dateValue && "text-muted-foreground")}>{label}</span>
                    <CalendarIcon className={cn(showClear && "invisible")} />
                </Button>
            </DatePickerTrigger>
            {showClear ? (
                <ArkDatePicker.ClearTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("actions.clear")}
                        className="absolute top-1/2 right-2 -translate-y-1/2"
                    >
                        <XIcon />
                    </Button>
                </ArkDatePicker.ClearTrigger>
            ) : null}
            <DatePickerContent>
                <CalendarViewControl>
                    <CalendarPrevTrigger />
                    <CalendarMonthSelect />
                    <CalendarYearSelect />
                    <CalendarNextTrigger />
                </CalendarViewControl>
                <CalendarTable>
                    <CalendarWeekDays />
                    <CalendarTableDays />
                </CalendarTable>
            </DatePickerContent>
        </DatePicker>
    );
}
