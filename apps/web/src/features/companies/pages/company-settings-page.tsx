import {useEffect, useState, type ReactNode} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Building2, CalendarClock, ScrollText} from "lucide-react";
import {SettingsLayout, SettingsSectionHeader} from "@/components/shared/settings-layout.tsx";
import {useSettingsSection} from "@/components/shared/use-settings-section.ts";
import {Button} from "@/components/ui/button.tsx";
import {Input, type InputProps} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {
    getOwnCompany,
    updateOwnCompany,
    type UpdateOwnCompanyPayload,
} from "@/features/companies/api/companies.api.ts";
import {SettingOptionSelect} from "@/features/setting-options/components/setting-option-select.tsx";

const EMPTY: UpdateOwnCompanyPayload = {name: "", currency: "", locale: "", timezone: ""};

// Kept as strings while editing so a cleared input doesn't snap back to 0.
type ReservationPolicyForm = {
    reservationDefaultDays: string;
    reservationMaxDays: string;
    reservationMaxExtensions: string;
};

const EMPTY_POLICY: ReservationPolicyForm = {
    reservationDefaultDays: "",
    reservationMaxDays: "",
    reservationMaxExtensions: "",
};

/** Same bounds as UpdateOwnCompanyDto in the API. */
function reservationPolicyError(policy: ReservationPolicyForm): "invalid" | "defaultExceedsMax" | null {
    const defaultDays = Number(policy.reservationDefaultDays);
    const maxDays = Number(policy.reservationMaxDays);
    const maxExtensions = Number(policy.reservationMaxExtensions);
    const inRange = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

    if (
        [policy.reservationDefaultDays, policy.reservationMaxDays, policy.reservationMaxExtensions].some((v) => v.trim() === "") ||
        !inRange(defaultDays, 1, 365) || !inRange(maxDays, 1, 365) || !inRange(maxExtensions, 0, 20)
    ) {
        return "invalid";
    }

    return defaultDays > maxDays ? "defaultExceedsMax" : null;
}

// CA-4: the details every contract, reservation agreement and receipt prints.
type LegalForm = {
    legalName: string;
    taxId: string;
    address: string;
    phone: string;
    signatoryName: string;
    signatoryTitle: string;
};

const EMPTY_LEGAL: LegalForm = {legalName: "", taxId: "", address: "", phone: "", signatoryName: "", signatoryTitle: ""};

const SECTION_IDS = ["general", "reservations", "legal"] as const;

export function CompanySettingsPage() {
    const {t} = useTranslation("settings");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();

    const companyQuery = useQuery({queryKey: ["companies", "me"], queryFn: getOwnCompany});
    const [form, setForm] = useState<UpdateOwnCompanyPayload>(EMPTY);
    const [policy, setPolicy] = useState<ReservationPolicyForm>(EMPTY_POLICY);
    const policyError = reservationPolicyError(policy);
    const [legal, setLegal] = useState<LegalForm>(EMPTY_LEGAL);
    const [activeSection, selectSection] = useSettingsSection(SECTION_IDS);

    useEffect(() => {
        if (!companyQuery.data) return;

        setForm({
            name: companyQuery.data.name,
            currency: companyQuery.data.currency ?? "",
            locale: companyQuery.data.locale ?? "",
            timezone: companyQuery.data.timezone ?? "",
        });
        setPolicy({
            reservationDefaultDays: String(companyQuery.data.reservationDefaultDays ?? ""),
            reservationMaxDays: String(companyQuery.data.reservationMaxDays ?? ""),
            reservationMaxExtensions: String(companyQuery.data.reservationMaxExtensions ?? ""),
        });
        setLegal({
            legalName: companyQuery.data.legalName ?? "",
            taxId: companyQuery.data.taxId ?? "",
            address: companyQuery.data.address ?? "",
            phone: companyQuery.data.phone ?? "",
            signatoryName: companyQuery.data.signatoryName ?? "",
            signatoryTitle: companyQuery.data.signatoryTitle ?? "",
        });
    }, [companyQuery.data]);

    const updateMutation = useMutation({
        mutationFn: (payload: Partial<UpdateOwnCompanyPayload>) => updateOwnCompany(payload),
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

    const setPolicyField = (key: keyof ReservationPolicyForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setPolicy((previous) => ({...previous, [key]: event.target.value}));

    const setLegalField = (key: keyof LegalForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setLegal((previous) => ({...previous, [key]: event.target.value}));

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
                <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("page.description")}</p>
            </div>

            <SettingsLayout
                sections={[
                    {id: "general", label: t("page.formTitle"), icon: Building2},
                    {id: "reservations", label: t("reservations.title"), icon: CalendarClock},
                    {id: "legal", label: t("legal.title"), icon: ScrollText},
                ]}
                activeSection={activeSection}
                onSelect={selectSection}
            >
                {/* Each section saves only its own fields — PATCH /companies/me
                    accepts a partial payload, so a half-edited reservation
                    policy never blocks saving the company name. */}
                {activeSection === "general" && (
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            updateMutation.mutate(form);
                        }}
                    >
                        <SettingsSectionHeader title={t("page.formTitle")} />

                        <Field
                            label={t("fields.name")}
                            required
                            value={form.name}
                            onChange={set("name")}
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <SelectField label={t("fields.currency")}>
                                <SettingOptionSelect
                                    type="CURRENCY"
                                    value={form.currency ?? ""}
                                    onChange={(value) => setForm((previous) => ({...previous, currency: value}))}
                                />
                            </SelectField>
                            <SelectField label={t("fields.locale")}>
                                <SettingOptionSelect
                                    type="LOCALE"
                                    value={form.locale ?? ""}
                                    onChange={(value) => setForm((previous) => ({...previous, locale: value}))}
                                />
                            </SelectField>
                            <SelectField label={t("fields.timezone")}>
                                <SettingOptionSelect
                                    type="TIMEZONE"
                                    value={form.timezone ?? ""}
                                    onChange={(value) => setForm((previous) => ({...previous, timezone: value}))}
                                />
                            </SelectField>
                        </div>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? tCommon("actions.saving") : tCommon("actions.saveChanges")}
                        </Button>
                    </form>
                )}

                {activeSection === "reservations" && (
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (policyError) return;
                            updateMutation.mutate({
                                reservationDefaultDays: Number(policy.reservationDefaultDays),
                                reservationMaxDays: Number(policy.reservationMaxDays),
                                reservationMaxExtensions: Number(policy.reservationMaxExtensions),
                            });
                        }}
                    >
                        <SettingsSectionHeader title={t("reservations.title")} description={t("reservations.description")} />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field
                                label={t("reservations.defaultDays")}
                                type="number"
                                min={1}
                                max={365}
                                value={policy.reservationDefaultDays}
                                onChange={setPolicyField("reservationDefaultDays")}
                            />
                            <Field
                                label={t("reservations.maxDays")}
                                type="number"
                                min={1}
                                max={365}
                                value={policy.reservationMaxDays}
                                onChange={setPolicyField("reservationMaxDays")}
                            />
                            <Field
                                label={t("reservations.maxExtensions")}
                                type="number"
                                min={0}
                                max={20}
                                value={policy.reservationMaxExtensions}
                                onChange={setPolicyField("reservationMaxExtensions")}
                            />
                        </div>
                        {policyError && (
                            <p className="text-sm text-destructive">{t(`reservations.errors.${policyError}`)}</p>
                        )}

                        <Button type="submit" disabled={updateMutation.isPending || !!policyError}>
                            {updateMutation.isPending ? tCommon("actions.saving") : tCommon("actions.saveChanges")}
                        </Button>
                    </form>
                )}
                {activeSection === "legal" && (
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            updateMutation.mutate(legal);
                        }}
                    >
                        <SettingsSectionHeader title={t("legal.title")} description={t("legal.description")} />

                        <Field
                            label={t("legal.legalName")}
                            placeholder={t("legal.legalNamePlaceholder")}
                            maxLength={200}
                            value={legal.legalName}
                            onChange={setLegalField("legalName")}
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label={t("legal.taxId")} maxLength={50} value={legal.taxId} onChange={setLegalField("taxId")} />
                            <Field label={t("legal.phone")} maxLength={50} value={legal.phone} onChange={setLegalField("phone")} />
                        </div>
                        <Field label={t("legal.address")} maxLength={300} value={legal.address} onChange={setLegalField("address")} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label={t("legal.signatoryName")} maxLength={200} value={legal.signatoryName} onChange={setLegalField("signatoryName")} />
                            <Field
                                label={t("legal.signatoryTitle")}
                                placeholder={t("legal.signatoryTitlePlaceholder")}
                                maxLength={200}
                                value={legal.signatoryTitle}
                                onChange={setLegalField("signatoryTitle")}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">{t("legal.hint")}</p>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? tCommon("actions.saving") : tCommon("actions.saveChanges")}
                        </Button>
                    </form>
                )}
            </SettingsLayout>
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

function SelectField({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="space-y-1.5">
            <span className="text-sm font-medium">{label}</span>
            {children}
        </div>
    );
}
