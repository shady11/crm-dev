import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {getRoles, setCompanyDiscountLimit} from "../api/rbac.api";
import type {Role} from "../types/rbac.types";

/**
 * E2E-24: on a built-in role, the company's own discount limit. Changing
 * the manager's 5% used to mean copying the role and moving every manager
 * onto the copy; now the owner sets it here, for their company only, and
 * can go back to the built-in default.
 */
export function CompanyDiscountLimit({role: opened}: {role: Role}) {
    const {t} = useTranslation("rbac");
    const queryClient = useQueryClient();
    // The sheet holds the role as it was when opened; the list is refetched
    // after a save, so the limit shown here follows it.
    const roles = useQuery({queryKey: ["rbac", "roles"], queryFn: getRoles});
    const role = roles.data?.find((r) => r.id === opened.id) ?? opened;
    // null: not edited, so the field shows the saved limit.
    const [edited, setEdited] = useState<string | null>(null);
    const value = edited ?? (role.discountLimit === null ? "" : String(role.discountLimit));

    const save = useMutation({
        mutationFn: (limit: number | null) => setCompanyDiscountLimit(role.id, limit),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["rbac", "roles"]});
            setEdited(null);
            toast.success({title: t("companyLimit.saved"), description: t("companyLimit.savedHint")});
        },
        onError: () => toast.error({title: t("companyLimit.error")}),
    });

    const parsed = Number(value.replace(",", "."));
    const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
    const changed = valid && parsed !== role.discountLimit;

    return (
        <div className="space-y-2 rounded-md border p-3">
            <span className="text-sm font-medium">{t("companyLimit.label")}</span>
            <div className="flex items-center gap-2">
                <Input
                    inputMode="decimal"
                    className="w-28"
                    value={value}
                    onChange={(e) => setEdited(e.target.value)}
                    aria-label={t("companyLimit.label")}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button type="button" size="sm" disabled={!changed || save.isPending} isLoading={save.isPending} onClick={() => save.mutate(parsed)}>
                    {t("companyLimit.save")}
                </Button>
                {role.discountLimitOverridden && (
                    <Button type="button" size="sm" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>
                        {t("companyLimit.reset", {limit: role.defaultDiscountLimit ?? "—"})}
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                {role.discountLimitOverridden
                    ? t("companyLimit.hintOverridden", {limit: role.defaultDiscountLimit ?? "—"})
                    : t("companyLimit.hint")}
            </p>
        </div>
    );
}
