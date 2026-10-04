import {useSearchParams} from "react-router-dom";

/**
 * Reads the active section from ?section=, so a section can be linked to and
 * survives a reload. The first section is the default and keeps the URL clean.
 */
export function useSettingsSection<T extends string>(sectionIds: readonly T[]) {
    const [searchParams, setSearchParams] = useSearchParams();
    const requested = searchParams.get("section");
    const activeSection = sectionIds.find((id) => id === requested) ?? sectionIds[0];
    const selectSection = (section: T) =>
        setSearchParams(section === sectionIds[0] ? {} : {section}, {replace: true});

    return [activeSection, selectSection] as const;
}
