import {useCallback} from "react";
import {useTranslation} from "react-i18next";

export type ActivityActorSource = {
    user?: {fullName: string} | null;
    /** SA-2: the platform admin, when it was done while viewing the app as `user`. */
    impersonatedBy?: {id: string; fullName: string} | null;
};

/**
 * Who did it, as a feed shows it: the person's name, or, for something a
 * platform admin did while viewing the app as them, both names, so the
 * company never sees the admin's work as that person's own (SA-2).
 */
export function useActivityActor() {
    const {t} = useTranslation("activities");

    return useCallback(
        (a: ActivityActorSource, fallback: string) => {
            const user = a.user?.fullName ?? fallback;
            return a.impersonatedBy ? t("actor.impersonated", {admin: a.impersonatedBy.fullName, user}) : user;
        },
        [t],
    );
}

/** For feeds that don't name the person (deal history, "My activity"): only the admin note. */
export function useImpersonationNote() {
    const {t} = useTranslation("activities");

    return useCallback(
        (a: ActivityActorSource) => (a.impersonatedBy ? t("actor.doneBy", {admin: a.impersonatedBy.fullName}) : null),
        [t],
    );
}
