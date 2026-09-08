import {useRef, useState} from "react";
import {UploadIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useImportUnits} from "@/features/units/hooks/use-import-units.ts";
import type {ImportUnitsResult} from "@/features/units/types/unit-import.types.ts";

type Props = {
    projectId: string;
};

export function ImportUnitsButton({projectId}: Props) {
    const {t} = useTranslation("units");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [result, setResult] = useState<ImportUnitsResult | null>(null);
    const importMutation = useImportUnits(projectId);

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        importMutation.mutate(file, {
            onSuccess: (data) => {
                setResult(data);
                if (data.failed === 0) {
                    toast.success({
                        title: t("import.toastSuccessTitle"),
                        description: t("import.toastSuccessDescription", {count: data.created}),
                    });
                }
            },
            onError: () => {
                toast.error({
                    title: t("import.toastErrorTitle"),
                    description: t("import.toastErrorDescription"),
                });
            },
        });
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                isLoading={importMutation.isPending}
            >
                <UploadIcon className="size-3" />
                {t("import.trigger")}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileSelected} />

            <Dialog open={result !== null} onOpenChange={({open}) => !open && setResult(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("import.resultTitle")}</DialogTitle>
                        <DialogDescription>
                            {result ? t("import.resultSummary", {created: result.created, failed: result.failed}) : null}
                        </DialogDescription>
                    </DialogHeader>

                    {result && result.errors.length > 0 ? (
                        <DialogBody>
                            <div className="max-h-72 overflow-y-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">{t("import.errorsTable.row")}</TableHead>
                                            <TableHead>{t("import.errorsTable.messages")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.errors.map((error) => (
                                            <TableRow key={error.row}>
                                                <TableCell>{error.row}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {error.messages.join("; ")}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </DialogBody>
                    ) : null}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={() => setResult(null)}>
                                {t("import.close")}
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
