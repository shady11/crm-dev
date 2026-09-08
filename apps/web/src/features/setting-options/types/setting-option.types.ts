export type SettingOptionType = "CURRENCY" | "LOCALE" | "TIMEZONE";

export type SettingOption = {
    id: string;
    type: SettingOptionType;
    code: string;
    label: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
