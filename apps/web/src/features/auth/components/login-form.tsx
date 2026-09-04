import * as React from "react"
import {useMemo} from "react"
import {cn} from "@/lib/utils"
import placeholderImg from '@/assets/placeholder.svg'
import {Button} from "@/components/ui/button.tsx"
import {Card, CardContent} from "@/components/ui/card.tsx"
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
import {useTranslation} from "react-i18next";

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
            email: "admin@crm.dev",
            password: "password123",
        },
    });

    const mutation = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            authStorage.setToken(data.accessToken);

            toast.success({
                title: t("login.success"),
            });

            navigate("/projects");
        },
    });

    const onSubmit = (values: LoginFormValues) => {
        mutation.mutate(values);
    };

    const errors = form.formState.errors;

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:px-8 md:py-12" onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup className="gap-6">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold mb-6">{t("login.title")}</h1>
                            </div>
                            <Field invalid={!!errors.email}>
                                <FieldLabel htmlFor="email">{t("login.emailLabel")}</FieldLabel>

                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    disabled={mutation.isPending}
                                    aria-invalid={!!errors.email}
                                    {...form.register("email")}
                                />

                                <FieldError>
                                    {errors.email?.message}
                                </FieldError>
                            </Field>
                            <Field invalid={!!errors.password}>
                                <FieldLabel htmlFor="password">{t("login.passwordLabel")}</FieldLabel>

                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    disabled={mutation.isPending}
                                    aria-invalid={!!errors.password}
                                    {...form.register("password")}
                                />

                                <FieldError>
                                    {errors.password?.message}
                                </FieldError>
                            </Field>

                            {mutation.isError && (
                                <Alert variant="destructive">
                                    <TriangleAlert />
                                    <AlertTitle>{t("login.failedTitle")}</AlertTitle>
                                    <AlertDescription>
                                        {t("login.failedDescription")}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Field className="mt-6">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {t("login.submit")}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="relative hidden bg-muted md:block">
                        <img
                            src={placeholderImg}
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}