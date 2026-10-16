import {useState} from "react";
import {Link} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {ArrowRightIcon, CheckCircle2Icon, CircleIcon, XIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import {getCompanySetupProgress, type CompanySetupProgress} from "@/features/companies/api/companies.api.ts";

const STEPS: {key: keyof CompanySetupProgress; to: string}[] = [
    {key: "branch", to: paths.branches.root},
    {key: "legalDetails", to: `${paths.settings}?section=legal`},
    {key: "project", to: paths.projects.root},
    {key: "team", to: paths.users},
];

const hiddenKey = (companyId: string) => `getting-started-hidden:${companyId}`;

function readHidden(companyId: string) {
    try {
        return localStorage.getItem(hiddenKey(companyId)) === "1";
    } catch {
        return false;
    }
}

/**
 * SA-8: a new company's admin lands on an empty dashboard; this says what to
 * set up first, each step opening the page that does it. It goes away once
 * every step is done, or when the admin hides it.
 */
export function GettingStartedCard({companyId}: {companyId: string}) {
    const {t} = useTranslation("dashboard");
    const [hidden, setHidden] = useState(() => readHidden(companyId));

    const progress = useQuery({
        queryKey: ["companies", "me", "setup"],
        queryFn: getCompanySetupProgress,
        enabled: !hidden,
    });

    const data = progress.data;
    if (hidden || !data) return null;

    const done = STEPS.filter((step) => data[step.key]).length;
    if (done === STEPS.length) return null;

    const hide = () => {
        try {
            localStorage.setItem(hiddenKey(companyId), "1");
        } catch {
            // Hidden for this visit only.
        }
        setHidden(true);
    };

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                    <CardTitle>{t("gettingStarted.title")}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {t("gettingStarted.progress", {done, total: STEPS.length})}
                    </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={t("gettingStarted.hide")} onClick={hide}>
                    <XIcon />
                </Button>
            </CardHeader>
            <CardContent>
                <ol className="grid gap-2 sm:grid-cols-2">
                    {STEPS.map((step) => {
                        const isDone = data[step.key];
                        return (
                            <li key={step.key}>
                                <Link
                                    to={step.to}
                                    className="flex h-full items-start gap-3 rounded-md border border-secondary p-3 text-sm transition-colors hover:bg-secondary/40"
                                >
                                    {isDone ? (
                                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className={`block font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                                            {t(`gettingStarted.steps.${step.key}.title`)}
                                        </span>
                                        <span className="block text-muted-foreground">
                                            {t(`gettingStarted.steps.${step.key}.body`)}
                                        </span>
                                    </span>
                                    {isDone ? null : <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            </CardContent>
        </Card>
    );
}
