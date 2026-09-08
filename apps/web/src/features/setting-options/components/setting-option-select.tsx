import {createListCollection} from "@ark-ui/react";
import {useQuery} from "@tanstack/react-query";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {getSettingOptions} from "../api/setting-options.api";
import type {SettingOptionType} from "../types/setting-option.types";

type Props = {
    type: SettingOptionType;
    value: string;
    onChange(value: string): void;
    placeholder?: string;
    className?: string;
};

/**
 * A currency/locale/timezone picker bound to the SUPER_ADMIN-managed option
 * list (see features/setting-options). Used both by the tenant self-service
 * settings page and the platform operator's company form, so the two never
 * drift out of sync with what's actually offered.
 */
export function SettingOptionSelect({type, value, onChange, placeholder, className}: Props) {
    const optionsQuery = useQuery({
        queryKey: ["setting-options", type],
        queryFn: () => getSettingOptions({type}),
    });

    const options = optionsQuery.data ?? [];
    const items = options.map((option) => ({label: `${option.label} (${option.code})`, value: option.code}));

    // A company can already hold a code that's since been deactivated or
    // removed from the picker. Keep it selectable (as its raw code) rather
    // than silently blanking the field out from under whoever opened this form.
    const allItems = value && !items.some((item) => item.value === value) ? [{label: value, value}, ...items] : items;

    const collection = createListCollection({items: allItems});

    return (
        <Select
            collection={collection}
            value={value ? [value] : []}
            onValueChange={({value: next}) => onChange(next[0] ?? "")}
        >
            <SelectTrigger className={className ?? "w-full"}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {collection.items.map((item) => (
                    <SelectItem key={item.value} item={item}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
