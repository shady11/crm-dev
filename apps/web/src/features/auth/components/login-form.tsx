import * as React from "react"
import {useMemo} from "react"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button.tsx"
import {Field, FieldError, FieldGroup, FieldLabel,} from "@/components/ui/field.tsx"
import {Input} from "@/components/ui/input.tsx"
import {z} from "zod";
import {useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {login} from "@/features/auth/api/auth.api.ts";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {Loader2, TriangleAlert} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {isAxiosError} from "axios";
import {useTranslation} from "react-i18next";
import {KeregeLogo} from "@/components/shared/kerege-logo.tsx";

type LoginFormValues = {
    email: string;
    password: string;
};

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentProps<"div">) {

    const { t } = useTranslation("auth");
    const navigate = useNavigate();

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const loginSchema = useMemo(() => z.object({
        email: z.email(t("login.validation.invalidEmail")),
        password: z.string().min(6, t("login.validation.passwordMin")),
    }), [t]);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const mutation = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            authStorage.setToken(data.accessToken);

            toast.success({
                title: t("login.success"),
            });

            // "/" is RoleLanding: the dashboard, or the platform dashboard for a SUPER_ADMIN.
            navigate("/");
        },
    });

    const onSubmit = (values: LoginFormValues) => {
        mutation.mutate(values);
    };

    const errors = form.formState.errors;
    const companyInactive =
        isAxiosError<{code?: string}>(mutation.error) && mutation.error.response?.data?.code === "COMPANY_INACTIVE";

    return (
        <div className={cn("w-full max-w-[420px]", className)} {...props}>
            {/* One frosted card, as in the reference design's sign-in dialog. */}
            <form
                className={cn(
                    "flex flex-col p-8",
                    "rounded-[28px] border border-glass-border",
                    "bg-white/75 dark:bg-[rgb(20_25_52/0.74)] backdrop-blur-[48px] backdrop-saturate-200",
                    "shadow-[0_2px_6px_0_rgb(35_42_77/0.06),0_30px_70px_-26px_rgb(35_42_77/0.4)]",
                    "dark:shadow-[0_2px_6px_0_rgb(0_0_0/0.4),0_34px_80px_-26px_rgb(0_0_0/0.85)]",
                )}
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
            >
                <KeregeLogo className="h-7 self-start" />

                <h1 className="mt-6 text-[30px] leading-tight font-semibold tracking-[-0.025em]">{t("login.title")}</h1>

                <FieldGroup className="mt-7 gap-3.5">
                    <Field invalid={!!errors.email}>
                        <FieldLabel htmlFor="email" className="text-[12.5px] font-semibold">{t("login.emailLabel")}</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="username"
                            autoFocus
                            className="h-11 rounded-[13px] px-3.5"
                            disabled={mutation.isPending}
                            aria-invalid={!!errors.email}
                            {...form.register("email")}
                        />
                        <FieldError>{errors.email?.message}</FieldError>
                    </Field>
                    <Field invalid={!!errors.password}>
                        <FieldLabel htmlFor="password" className="text-[12.5px] font-semibold">{t("login.passwordLabel")}</FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className="h-11 rounded-[13px] px-3.5"
                            disabled={mutation.isPending}
                            aria-invalid={!!errors.password}
                            {...form.register("password")}
                        />
                        <FieldError>{errors.password?.message}</FieldError>
                    </Field>
                </FieldGroup>

                {mutation.isError && (
                    <Alert variant="destructive" className="mt-5">
                        <TriangleAlert />
                        {/* SA-12: a suspended company's users are told so, not "wrong password". */}
                        <AlertTitle>
                            {companyInactive ? t("login.companyInactiveTitle") : t("login.failedTitle")}
                        </AlertTitle>
                        <AlertDescription>
                            {companyInactive
                                ? t("login.companyInactiveDescription")
                                : t("login.failedDescription")}
                        </AlertDescription>
                    </Alert>
                )}

                <Button
                    type="submit"
                    className="mt-7 h-[52px] w-full rounded-2xl text-[15px] font-semibold"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("login.submit")}
                </Button>
            </form>
        </div>
    )
}
