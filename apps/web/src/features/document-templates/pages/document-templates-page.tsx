import {useMemo, useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {RotateCcw, TriangleAlert} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useDebouncedValue} from "@/hooks/use-debounced-value.ts";
import {apiErrorMessage} from "@/lib/api-error.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {
    getTemplateEditor,
    previewTemplate,
    resetTemplate,
    saveTemplate,
    TEMPLATE_TYPES,
    type TemplateEditorData,
    type TemplateType,
} from "../api/document-templates.api";

type Draft = {name: string; html: string};

const TYPE_LABEL_KEYS: Record<TemplateType, string> = {
    RESERVATION: "documents:templates.types.RESERVATION",
    CONTRACT: "documents:templates.types.CONTRACT",
    PAYMENT_RECEIPT: "documents:templates.types.PAYMENT_RECEIPT",
};

/**
 * CA-5: a company's own wording for its reservation agreements, contracts
 * and receipts. The left side is the template's HTML with the placeholders
 * it can use; the right side is the same template filled with sample data,
 * rendered in a sandboxed frame. The API checks a template against that
 * sample before saving, so a misspelt placeholder is caught here rather than
 * when someone generates a contract.
 */
export function DocumentTemplatesPage() {
    const {t, i18n} = useTranslation("documents");
    const queryClient = useQueryClient();
    const [type, setType] = useState<TemplateType>("CONTRACT");
    // Unsaved edits per type, so switching tabs doesn't lose them.
    const [drafts, setDrafts] = useState<Partial<Record<TemplateType, Draft>>>({});
    const [placeholderFilter, setPlaceholderFilter] = useState("");
    const editorRef = useRef<HTMLTextAreaElement>(null);

    const editorQuery = useQuery({
        queryKey: ["document-templates", "editor", type],
        queryFn: () => getTemplateEditor(type),
    });
    const data = editorQuery.data;

    const saved: Draft | null = data
        ? {name: data.current?.name ?? t(TYPE_LABEL_KEYS[type]), html: data.current?.bodyHtml ?? data.defaultHtml}
        : null;
    const draft = drafts[type] ?? saved;
    const isDirty = !!draft && !!saved && (draft.name !== saved.name || draft.html !== saved.html);

    const setDraft = (next: Partial<Draft>) => {
        if (!draft) return;
        setDrafts((previous) => ({...previous, [type]: {...draft, ...next}}));
    };

    const discardDraft = () => setDrafts((previous) => ({...previous, [type]: undefined}));

    const debouncedHtml = useDebouncedValue(draft?.html ?? "", 600);
    const previewQuery = useQuery({
        queryKey: ["document-templates", "preview", type, debouncedHtml],
        queryFn: () => previewTemplate(type, debouncedHtml),
        enabled: debouncedHtml.length > 0,
        retry: false,
        placeholderData: (previous) => previous,
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["document-templates", "editor", type]});

    const save = useMutation({
        mutationFn: () => saveTemplate(type, draft!.name.trim(), draft!.html),
        onSuccess: async (created) => {
            await refresh();
            discardDraft();
            toast.success({title: t("templates.toasts.saved", {version: created.version})});
        },
        onError: (error) => toast.error({title: t("templates.toasts.saveError"), description: apiErrorMessage(error)}),
    });

    const reset = useMutation({
        mutationFn: () => resetTemplate(type),
        onSuccess: async () => {
            await refresh();
            discardDraft();
            toast.success({title: t("templates.toasts.reset")});
        },
        onError: (error) => toast.error({title: t("templates.toasts.resetError"), description: apiErrorMessage(error)}),
    });

    const insertPlaceholder = (token: string) => {
        const area = editorRef.current;
        if (!draft || !area) return;
        const start = area.selectionStart ?? draft.html.length;
        const end = area.selectionEnd ?? start;
        setDraft({html: draft.html.slice(0, start) + token + draft.html.slice(end)});
        requestAnimationFrame(() => {
            area.focus();
            area.setSelectionRange(start + token.length, start + token.length);
        });
    };

    const placeholders = useMemo(() => {
        const filter = placeholderFilter.trim().toLowerCase();
        return (data?.placeholders ?? []).filter(
            (p) => !filter || p.token.toLowerCase().includes(filter) || p.example.toLowerCase().includes(filter),
        );
    }, [data?.placeholders, placeholderFilter]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("templates.page.heading")}</h2>
                <p className="text-muted-foreground text-sm">{t("templates.page.description")}</p>
            </div>

            <Tabs value={type} onValueChange={({value}) => setType(value as TemplateType)}>
                <TabsList variant="underline" className="w-full justify-start overflow-x-auto">
                    {TEMPLATE_TYPES.map((value) => (
                        <TabsTrigger key={value} value={value} className="grow-0 px-3">
                            {t(TYPE_LABEL_KEYS[value])}
                            {drafts[value] && <span className="bg-primary size-1.5 rounded-full" aria-label={t("templates.unsaved")} />}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {editorQuery.isLoading || !data || !draft ? (
                <div className="flex h-64 items-center justify-center">
                    <Spinner />
                </div>
            ) : (
                <>
                    <StatusBar
                        data={data}
                        locale={i18n.language}
                        onLoadVersion={(html, name) => setDrafts((previous) => ({...previous, [type]: {html, name}}))}
                        onReset={() => reset.mutate()}
                        isResetting={reset.isPending}
                    />

                    <div className="grid gap-6 xl:grid-cols-2">
                        <div className="flex min-w-0 flex-col gap-4">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("templates.fields.name")}</span>
                                <Input
                                    value={draft.name}
                                    maxLength={200}
                                    onChange={(event) => setDraft({name: event.target.value})}
                                />
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("templates.fields.html")}</span>
                                <textarea
                                    ref={editorRef}
                                    value={draft.html}
                                    onChange={(event) => setDraft({html: event.target.value})}
                                    spellCheck={false}
                                    className="border-input bg-background focus-visible:ring-ring/32 h-[28rem] w-full resize-y rounded-lg border p-3 font-mono text-xs leading-5 outline-none focus-visible:ring-[3px]"
                                />
                            </label>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    disabled={!isDirty || save.isPending || draft.name.trim().length < 2}
                                    isLoading={save.isPending}
                                    onClick={() => save.mutate()}
                                >
                                    {t("templates.actions.save")}
                                </Button>
                                <Button variant="outline" disabled={!isDirty || save.isPending} onClick={discardDraft}>
                                    {t("templates.actions.discard")}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setDraft({html: data.defaultHtml})}
                                    disabled={draft.html === data.defaultHtml}
                                >
                                    {t("templates.actions.startFromDefault")}
                                </Button>
                            </div>

                            <div className="space-y-2 rounded-lg border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{t("templates.placeholders.title")}</span>
                                    <Input
                                        className="h-8 w-48"
                                        placeholder={t("templates.placeholders.search")}
                                        value={placeholderFilter}
                                        onChange={(event) => setPlaceholderFilter(event.target.value)}
                                    />
                                </div>
                                <p className="text-muted-foreground text-xs">{t("templates.placeholders.hint")}</p>
                                <ul className="max-h-64 divide-y overflow-y-auto">
                                    {placeholders.map((placeholder) => (
                                        <li key={placeholder.token}>
                                            <button
                                                type="button"
                                                onClick={() => insertPlaceholder(placeholder.token)}
                                                className="hover:bg-accent flex w-full items-baseline justify-between gap-3 px-2 py-1.5 text-left"
                                            >
                                                <code className="text-primary text-xs break-all">{placeholder.token}</code>
                                                <span className="text-muted-foreground shrink-0 text-xs">{placeholder.example || "—"}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{t("templates.preview.title")}</span>
                                {previewQuery.isFetching && <Spinner className="size-4" />}
                            </div>
                            {previewQuery.isError && (
                                <Alert variant="destructive">
                                    <TriangleAlert />
                                    <AlertTitle>{t("templates.preview.error")}</AlertTitle>
                                    <AlertDescription>{apiErrorMessage(previewQuery.error)}</AlertDescription>
                                </Alert>
                            )}
                            {/* sandbox="" : no scripts, no forms, no navigation. */}
                            <iframe
                                title={t("templates.preview.title")}
                                sandbox=""
                                srcDoc={previewQuery.data ?? ""}
                                className="h-[46rem] w-full rounded-lg border bg-white"
                            />
                            <p className="text-muted-foreground text-xs">{t("templates.preview.hint")}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatusBar({
    data,
    locale,
    onLoadVersion,
    onReset,
    isResetting,
}: {
    data: TemplateEditorData;
    locale: string;
    onLoadVersion(html: string, name: string): void;
    onReset(): void;
    isResetting: boolean;
}) {
    const {t} = useTranslation("documents");
    const current = data.current;

    const versionCollection = createListCollection({
        items: data.versions.map((version) => ({
            label: t("templates.versions.item", {
                version: version.version,
                date: formatDate(version.createdAt, locale).date,
                name: version.createdBy?.fullName ?? "—",
            }),
            value: version.id,
        })),
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                {current ? (
                    <>
                        <Badge variant="secondary">{t("templates.status.custom", {version: current.version})}</Badge>
                        <span className="text-muted-foreground">
                            {t("templates.status.savedBy", {
                                name: current.createdBy?.fullName ?? "—",
                                date: formatDate(current.createdAt, locale).date,
                            })}
                        </span>
                    </>
                ) : (
                    <>
                        <Badge variant="outline">{t("templates.status.default")}</Badge>
                        <span className="text-muted-foreground">{t("templates.status.defaultHint")}</span>
                    </>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {data.versions.length > 0 && (
                    <Select
                        collection={versionCollection}
                        value={[]}
                        onValueChange={({value}) => {
                            const version = data.versions.find((v) => v.id === value[0]);
                            if (version) onLoadVersion(version.bodyHtml, version.name);
                        }}
                    >
                        <SelectTrigger className="w-64" aria-label={t("templates.versions.load")}>
                            <SelectValue placeholder={t("templates.versions.load")} />
                        </SelectTrigger>
                        <SelectContent>
                            {versionCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {current && (
                    <Button variant="outline" size="sm" disabled={isResetting} isLoading={isResetting} onClick={onReset}>
                        <RotateCcw className="size-3.5" />
                        {t("templates.actions.reset")}
                    </Button>
                )}
            </div>
        </div>
    );
}
