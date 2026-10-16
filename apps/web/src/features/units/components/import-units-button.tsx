import {useRef, useState} from "react";
import {Link} from "react-router-dom";
import {isAxiosError} from "axios";
import {DownloadIcon, FileWarning, UploadIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useImportUnits} from "@/features/units/hooks/use-import-units.ts";
import {downloadImportSample} from "@/features/units/api/units.api.ts";
import {
    IMPORT_FIELDS,
    OPTIONAL_IMPORT_FIELDS,
    type ImportFileError,
    type ImportUnitsResult,
} from "@/features/units/types/unit-import.types.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {paths} from "@/routes/paths.ts";

type Props = {
    projectId: string;
};

/**
 * The column names a file may use, as shown in the guide. The API accepts
 * a few more spellings (units-import.constants.ts); these are the ones to
 * suggest.
 */
const COLUMN_NAMES: Record<(typeof IMPORT_FIELDS)[number], string[]> = {
    block: ["Block", "Блок", "Корпус"],
    entrance: ["Entrance", "Подъезд", "Кире бериш"],
    floor: ["Floor", "Этаж", "Кабат"],
    number: ["Number", "Номер", "№"],
    area: ["Area", "Площадь", "Аянт"],
    price: ["Price", "Цена", "Баа"],
    type: ["Type", "Тип", "Түрү"],
    rooms: ["Rooms", "Комнаты", "Бөлмөлөр"],
};

function fileErrorOf(error: unknown): ImportFileError | null {
    if (!isAxiosError<Partial<ImportFileError>>(error)) return null;
    const data = error.response?.data;
    return data?.code === "IMPORT_UNRECOGNISED_COLUMNS" || data?.code === "IMPORT_MISSING_COLUMNS"
        ? {code: data.code, missing: data.missing ?? [], found: data.found ?? []}
        : null;
}

/**
 * CA-7: importing explains itself first (the columns, in any of the three
 * languages, a sample file, and what a second import does to prices), then
 * shows what happened: units created, prices changed or sent for approval,
 * prices kept on units that aren't on sale, and rows with problems.
 */
export function ImportUnitsButton({projectId}: Props) {
    const {t, i18n} = useTranslation("units");
    const {user} = useAuth();
    const {formatCurrency} = useCompanyFormatters();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<ImportUnitsResult | null>(null);
    const [fileError, setFileError] = useState<ImportFileError | null>(null);
    const [downloading, setDownloading] = useState(false);
    const importMutation = useImportUnits(projectId);

    const fieldLabel = (field: string) => t(`import.columns.${field}.label`);

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setFileError(null);
        importMutation.mutate(file, {
            onSuccess: (data) => {
                setResult(data);
                if (data.failed === 0 && data.keptPrices.length === 0) {
                    toast.success({
                        title: t("import.toastSuccessTitle"),
                        description: t("import.result.created", {count: data.created}),
                    });
                }
            },
            onError: (error) => {
                const columns = fileErrorOf(error);
                if (columns) {
                    setFileError(columns);
                    return;
                }
                toast.error({
                    title: t("import.toastErrorTitle"),
                    description: t("import.toastErrorDescription"),
                });
            },
        });
    };

    const downloadSample = async () => {
        setDownloading(true);
        try {
            await downloadImportSample(i18n.language);
        } catch {
            toast.error({title: t("import.sampleError")});
        } finally {
            setDownloading(false);
        }
    };

    const close = () => {
        setOpen(false);
        setResult(null);
        setFileError(null);
    };

    // Importing units is COMPANY_ADMIN only (POST /projects/:id/units/import).
    if (!hasPermission(user, "inventory.manage")) {
        return null;
    }

    const priceRule = !hasPermission(user, "units.edit_price")
        ? t("import.reimport.noEditPrice")
        : hasPermission(user, "units.approve_price")
          ? t("import.reimport.applied")
          : t("import.reimport.needsApproval");

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <UploadIcon className="size-3" />
                {t("import.trigger")}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileSelected} />

            <Dialog open={open} onOpenChange={({open: next}) => !next && close()}>
                <DialogContent className="sm:max-w-2xl">
                    {result ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t("import.resultTitle")}</DialogTitle>
                            </DialogHeader>
                            <DialogBody className="space-y-4">
                                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                                    <SummaryItem label={t("import.result.created", {count: result.created})} />
                                    <SummaryItem label={t("import.result.pricesUpdated", {count: result.pricesUpdated})} hidden={!result.pricesUpdated} />
                                    <SummaryItem label={t("import.result.pricesRequested", {count: result.pricesRequested})} hidden={!result.pricesRequested} />
                                    <SummaryItem label={t("import.result.unchanged", {count: result.unchanged})} hidden={!result.unchanged} />
                                    <SummaryItem label={t("import.result.kept", {count: result.keptPrices.length})} hidden={!result.keptPrices.length} tone="warning" />
                                    <SummaryItem label={t("import.result.failed", {count: result.failed})} hidden={!result.failed} tone="destructive" />
                                </ul>

                                {result.pricesRequested > 0 && (
                                    <p className="text-muted-foreground text-sm">
                                        {t("import.result.requestedHint")}{" "}
                                        <Link to={paths.priceChanges} className="text-foreground font-medium underline" onClick={close}>
                                            {t("import.result.reviewPriceChanges")}
                                        </Link>
                                    </p>
                                )}

                                {result.keptPrices.length > 0 && (
                                    <section className="space-y-2">
                                        <h3 className="text-sm font-medium">{t("import.kept.title")}</h3>
                                        <p className="text-muted-foreground text-xs">{t("import.kept.hint")}</p>
                                        <div className="max-h-56 overflow-y-auto rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-14">{t("import.errorsTable.row")}</TableHead>
                                                        <TableHead>{t("import.kept.unit")}</TableHead>
                                                        <TableHead>{t("import.kept.status")}</TableHead>
                                                        <TableHead className="text-right">{t("import.kept.prices")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {result.keptPrices.map((kept) => (
                                                        <TableRow key={kept.row}>
                                                            <TableCell>{kept.row}</TableCell>
                                                            <TableCell>{t("import.kept.unitLabel", {block: kept.block, number: kept.number})}</TableCell>
                                                            <TableCell>{t(`status.${kept.status.toLowerCase()}`)}</TableCell>
                                                            <TableCell className="text-right text-sm whitespace-nowrap">
                                                                {formatCurrency(kept.currentPrice)}
                                                                <span className="text-muted-foreground">
                                                                    {" "}{t("import.kept.fileSays", {price: formatCurrency(kept.filePrice)})}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>
                                )}

                                {result.errors.length > 0 && (
                                    <section className="space-y-2">
                                        <h3 className="text-sm font-medium">{t("import.errorsTitle")}</h3>
                                        <div className="max-h-56 overflow-y-auto rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-14">{t("import.errorsTable.row")}</TableHead>
                                                        <TableHead>{t("import.errorsTable.messages")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {result.errors.map((error) => (
                                                        <TableRow key={error.row}>
                                                            <TableCell>{error.row}</TableCell>
                                                            <TableCell className="text-muted-foreground text-sm whitespace-normal">
                                                                {(error.codes ?? [])
                                                                    .map(({code, params}) => t(`import.rowErrors.${code}`, params ?? {}))
                                                                    .join("; ") || error.messages.join("; ")}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>
                                )}
                            </DialogBody>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setResult(null)}>
                                    {t("import.another")}
                                </Button>
                                <Button variant="secondary" onClick={close}>
                                    {t("import.close")}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t("import.guide.title")}</DialogTitle>
                                <DialogDescription>{t("import.guide.description")}</DialogDescription>
                            </DialogHeader>
                            <DialogBody className="space-y-4">
                                {fileError && (
                                    <Alert variant="destructive">
                                        <FileWarning />
                                        <AlertTitle>{t("import.fileErrors.title")}</AlertTitle>
                                        <AlertDescription>
                                            {fileError.code === "IMPORT_UNRECOGNISED_COLUMNS"
                                                ? t("import.fileErrors.unrecognised", {
                                                    found: fileError.found.join(", ") || "—",
                                                })
                                                : t("import.fileErrors.missing", {
                                                    missing: fileError.missing.map(fieldLabel).join(", "),
                                                })}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("import.guide.column")}</TableHead>
                                                <TableHead>{t("import.guide.names")}</TableHead>
                                                <TableHead>{t("import.guide.example")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {IMPORT_FIELDS.map((field) => (
                                                <TableRow key={field}>
                                                    <TableCell className="font-medium whitespace-nowrap">
                                                        {fieldLabel(field)}
                                                        {OPTIONAL_IMPORT_FIELDS.includes(field) && (
                                                            <Badge variant="outline" className="ms-2 text-[10px]">
                                                                {t("import.guide.optional")}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs whitespace-normal">
                                                        {COLUMN_NAMES[field].join(" · ")}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs whitespace-normal">
                                                        {t(`import.columns.${field}.hint`)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="bg-muted/50 space-y-1 rounded-md p-3 text-sm">
                                    <p className="font-medium">{t("import.reimport.title")}</p>
                                    <p className="text-muted-foreground">
                                        {t("import.reimport.body")} {priceRule}
                                    </p>
                                </div>
                            </DialogBody>
                            <DialogFooter className="sm:justify-between">
                                <Button variant="ghost" onClick={downloadSample} isLoading={downloading} disabled={downloading}>
                                    <DownloadIcon className="size-3.5" />
                                    {t("import.sample")}
                                </Button>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importMutation.isPending}
                                    isLoading={importMutation.isPending}
                                >
                                    <UploadIcon className="size-3.5" />
                                    {importMutation.isPending ? t("import.importing") : t("import.chooseFile")}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function SummaryItem({label, hidden, tone}: {label: string; hidden?: boolean; tone?: "warning" | "destructive"}) {
    if (hidden) return null;
    return (
        <li
            className={
                tone === "destructive"
                    ? "text-destructive"
                    : tone === "warning"
                      ? "text-amber-700 dark:text-amber-400"
                      : undefined
            }
        >
            {label}
        </li>
    );
}
