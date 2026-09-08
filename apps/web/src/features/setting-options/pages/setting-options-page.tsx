import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Pencil, Plus, SlidersHorizontal, Trash2} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
    createSettingOption,
    type CreateSettingOptionPayload,
    deleteSettingOption,
    getSettingOptions,
    updateSettingOption,
} from "../api/setting-options.api";
import type {SettingOption, SettingOptionType} from "../types/setting-option.types";
import {SettingOptionFormSheet} from "../components/setting-option-form-sheet";

const TYPES: SettingOptionType[] = ["CURRENCY", "LOCALE", "TIMEZONE"];

export function SettingOptionsPage() {
    const {t} = useTranslation("settingOptions");
    const [activeType, setActiveType] = useState<SettingOptionType>("CURRENCY");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("page.description")}</p>
            </div>

            <Tabs value={activeType} onValueChange={({value}) => setActiveType(value as SettingOptionType)}>
                <TabsList>
                    {TYPES.map((type) => (
                        <TabsTrigger key={type} value={type}>
                            {t(`types.${type}`)}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TYPES.map((type) => (
                    <TabsContent key={type} value={type}>
                        <OptionsPanel type={type} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

type Pending = {action: "delete"; option: SettingOption} | null;

function OptionsPanel({type}: {type: SettingOptionType}) {
    const {t} = useTranslation("settingOptions");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<SettingOption | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const optionsQuery = useQuery({
        queryKey: ["setting-options", type, {includeInactive: true}],
        queryFn: () => getSettingOptions({type, includeInactive: true}),
    });

    const refresh = () =>
        queryClient.invalidateQueries({queryKey: ["setting-options"]});

    const save = useMutation({
        mutationFn: (payload: CreateSettingOptionPayload) =>
            editing ? updateSettingOption(editing.id, {label: payload.label}) : createSettingOption(payload),
        onSuccess: () => {
            void refresh();
            setFormOpen(false);
            setEditing(null);
            toast.success(editing ? t("toasts.updateSuccess") : t("toasts.createSuccess"));
        },
        onError: () => toast.error(editing ? t("toasts.updateError") : t("toasts.createError")),
    });

    const toggleActive = useMutation({
        mutationFn: (option: SettingOption) => updateSettingOption(option.id, {isActive: !option.isActive}),
        onSuccess: () => void refresh(),
        onError: () => toast.error(t("toasts.updateError")),
    });

    const remove = useMutation({
        mutationFn: (option: SettingOption) => deleteSettingOption(option.id),
        onSuccess: () => {
            void refresh();
            setPending(null);
            toast.success(t("toasts.deleteSuccess"));
        },
        onError: () => {
            setPending(null);
            toast.error(t("toasts.deleteError"));
        },
    });

    const items = optionsQuery.data ?? [];

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    {t("page.newOption")}
                </Button>
            </div>

            {optionsQuery.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <SlidersHorizontal />
                        </EmptyMedia>
                        <EmptyTitle>{t("page.empty.title")}</EmptyTitle>
                        <EmptyDescription>{t("page.empty.description")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("page.table.headers.code")}</TableHead>
                                <TableHead>{t("page.table.headers.label")}</TableHead>
                                <TableHead>{t("page.table.headers.status")}</TableHead>
                                <TableHead className="w-0" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((option) => (
                                <TableRow key={option.id} className={option.isActive ? undefined : "opacity-60"}>
                                    <TableCell className="font-mono text-sm">{option.code}</TableCell>
                                    <TableCell>{option.label}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={option.isActive}
                                                onCheckedChange={() => toggleActive.mutate(option)}
                                                aria-label={
                                                    option.isActive
                                                        ? t("page.rowActions.deactivate", {code: option.code})
                                                        : t("page.rowActions.activate", {code: option.code})
                                                }
                                            />
                                            <Badge variant={option.isActive ? "secondary" : "outline"}>
                                                {option.isActive ? t("status.active") : t("status.inactive")}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label={t("page.rowActions.edit", {code: option.code})}
                                                onClick={() => {
                                                    setEditing(option);
                                                    setFormOpen(true);
                                                }}
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label={t("page.rowActions.delete", {code: option.code})}
                                                onClick={() => setPending({action: "delete", option})}
                                            >
                                                <Trash2 className="text-destructive size-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <SettingOptionFormSheet
                open={formOpen}
                type={type}
                option={editing}
                isSubmitting={save.isPending}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDialog.delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending ? (
                                <>
                                    <span className="font-medium">{pending.option.code}</span> —{" "}
                                    {t("confirmDialog.delete.body")}
                                </>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={remove.isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={remove.isPending}
                            onClick={() => pending && remove.mutate(pending.option)}
                        >
                            {remove.isPending ? t("confirmDialog.working") : t("confirmDialog.delete.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
