"use client"

import type { ReactNode } from "react"
import {useTranslation} from "react-i18next";
import {Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger} from "@/components/ui/menu.tsx";
import {setUserLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage} from "@/lib/i18n";

type Props = {
    trigger: ReactNode
    defaultOpen?: boolean
}

const LanguageDropdown = ({ defaultOpen, trigger }: Props) => {
    const { t, i18n } = useTranslation("common");

    const labels: Record<SupportedLanguage, string> = {
        ru: t("language.russian"),
        en: t("language.english"),
    };

    return (
        <Menu defaultOpen={defaultOpen}>
            <MenuTrigger asChild>{trigger}</MenuTrigger>
            <MenuContent>
                <MenuRadioGroup
                    value={i18n.language}
                    onValueChange={(details) => setUserLanguage(details.value as SupportedLanguage)}
                >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <MenuRadioItem key={lang} value={lang}>
                            {labels[lang]}
                        </MenuRadioItem>
                    ))}
                </MenuRadioGroup>
            </MenuContent>
        </Menu>
    )
}

export default LanguageDropdown
