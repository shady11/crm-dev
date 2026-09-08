import {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input, type InputProps} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {
    getOwnCompany,
    updateOwnCompany,
    type UpdateOwnCompanyPayload,
} from "@/features/companies/api/companies.api.ts";

const EMPTY: UpdateOwnCompanyPayload = {name: "", currency: "", locale: "", timezone: ""};

export function CompanySettingsPage() {
    const {t} = useTranslation("settings");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();

    const companyQuery = useQuery({queryKey: ["companies", "me"], queryFn: getOwnCompany});
    const [form, setForm] = useState<UpdateOwnCompanyPayload>(EMPTY);

    useEffect(() => {
        if (!companyQuery.data) return;

        setForm({
            name: companyQuery.data.name,
            currency: companyQuery.data.currency ?? "",
            locale: companyQuery.data.locale ?? "",
            timezone: companyQuery.data.timezone ?? "",
        });
    }, [companyQuery.data]);

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateOwnCompanyPayload) => updateOwnCompany(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["companies", "me"]});
            // Refreshes useAuth()'s cached AuthUser — useCompanyFormatters() reads
            // user.company from there, so this is what makes a currency/locale
            // change take effect app-wide on the very next render, not just on
            // this page.
            await queryClient.invalidateQueries({queryKey: ["auth", "me"]});

            toast.success({
                title: t("toasts.updateSuccessTitle"),
                description: t("toasts.updateSuccessDescription"),
            });
        },
        onError: () => {
            toast.error({
                title: t("toasts.updateErrorTitle"),
                description: t("toasts.updateErrorDescription"),
            });
        },
    });

    const set = (key: keyof UpdateOwnCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((previous) => ({...previous, [key]: event.target.value}));

    if (companyQuery.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("page.description")}</p>
            </div>

            <Card className="max-w-xl border border-secondary shadow-none">
                <CardHeader>
                    <CardTitle className="text-base">{t("page.formTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            updateMutation.mutate(form);
                        }}
                    >
                        <Field
                            label={t("fields.name")}
                            required
                            value={form.name}
                            onChange={set("name")}
                        />

                        <div className="grid grid-cols-3 gap-3">
                            <Field label={t("fields.currency")} value={form.currency} onChange={set("currency")} />
                            <Field label={t("fields.locale")} value={form.locale} onChange={set("locale")} />
                            <Field label={t("fields.timezone")} value={form.timezone} onChange={set("timezone")} />
                        </div>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? tCommon("actions.saving") : tCommon("actions.saveChanges")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

type FieldProps = InputProps & {label: string};

function Field({label, ...props}: FieldProps) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{label}</span>
            <Input aria-label={label} {...props} />
        </label>
    );
}
