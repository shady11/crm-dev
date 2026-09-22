import {createListCollection} from "@ark-ui/react";
import {useTranslation} from "react-i18next";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {useBranchesFilter} from "../hooks/use-branches-filter";

type Props = {
    value: string | "all";
    onChange(value: string | "all"): void;
    className?: string;
};

// BR-B3: an admin-only cross-branch filter. Renders nothing for a
// branch-scoped viewer — their own branch is already fixed server-side, so
// offering this control would be misleading. Deliberately a separate
// component from anything driving BR-B1's restriction, so neither is ever
// mistaken for the other.
export function BranchFilterSelect({value, onChange, className}: Props) {
    const {t} = useTranslation("branches");
    const {user} = useAuth();
    // Company-wide but permission-less viewers exist too (e.g. a custom
    // role without branches.view) — GET /branches 403s for them same as it
    // would for a branch-scoped one, so gate on both. Passed into the hook
    // itself (not just this early return) so the query never fires only to
    // have its result discarded — see useBranchesFilter's doc comment.
    const canViewBranches = !!user && !user.isBranchScoped && hasPermission(user, "branches.view");
    const branches = useBranchesFilter(canViewBranches);

    if (!canViewBranches) return null;

    const collection = createListCollection({
        items: [
            {label: t("select.allBranches"), value: "all"},
            ...branches.data.map((branch) => ({label: branch.name, value: branch.id})),
        ],
    });

    return (
        <Select
            collection={collection}
            value={[value]}
            onValueChange={({value: next}) => onChange(next[0] ?? "all")}
        >
            <SelectTrigger className={className ?? "w-44"}>
                <SelectValue placeholder={t("select.placeholder")} />
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
