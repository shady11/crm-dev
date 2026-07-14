"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import {Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger} from "@/components/ui/menu.tsx";

type Props = {
    trigger: ReactNode
    defaultOpen?: boolean
}

const LanguageDropdown = ({ defaultOpen, trigger }: Props) => {
    const [language, setLanguage] = useState("english")

    return (
        <Menu defaultOpen={defaultOpen}>
            <MenuTrigger asChild>{trigger}</MenuTrigger>
            <MenuContent>
                <MenuRadioGroup
                    value={language}
                    onValueChange={(details) => setLanguage(details.value)}
                >
                    <MenuRadioItem value="kyrgyz">Кыргызча</MenuRadioItem>
                    <MenuRadioItem value="russian">Русский</MenuRadioItem>
                    <MenuRadioItem value="english">English</MenuRadioItem>
                </MenuRadioGroup>
            </MenuContent>
        </Menu>
    )
}

export default LanguageDropdown
