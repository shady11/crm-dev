import {useRef, useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {DownloadIcon, FileIcon, Trash2Icon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useEntityDocuments} from "@/features/documents/hooks/use-entity-documents.ts";
import {useDocumentActions} from "@/features/documents/hooks/use-document-actions.ts";
import {
    DOCUMENT_TYPE_LABEL_KEYS,
    type DocumentOwnerType,
    DocumentType,
    formatFileSize
} from "@/features/documents/types/document.types.ts";
import {useTranslation} from "react-i18next";

interface EntityDocumentsCardProps {
    ownerType: DocumentOwnerType;
    ownerId: string;
}

export function EntityDocumentsCard({ ownerType, ownerId }: EntityDocumentsCardProps) {
    const { t } = useTranslation("documents");

    const { documents, isLoading } = useEntityDocuments(ownerType, ownerId);
    const actions = useDocumentActions();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.OTHER);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            actions.upload.mutate({ file, ownerType, ownerId, type: selectedType });
        }
        e.target.value = "";
    };

    const typeCollection = createListCollection({
        items: Object.values(DocumentType).map(
            (type) => ({
                label: t(DOCUMENT_TYPE_LABEL_KEYS[type]),
                value: type
            })
        ),
    });

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">
                    {t("card.title")}{documents.length > 0 && ` (${documents.length})`}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Select
                        collection={typeCollection}
                        value={[selectedType]}
                        onValueChange={({ value }) => setSelectedType(value[0] as DocumentType)}
                    >
                        <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {typeCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={actions.upload.isPending}>
                        {t("card.upload")}
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? null : documents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("card.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 py-2.5 text-sm">
                                <FileIcon size={18} className="shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{doc.originalName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(DOCUMENT_TYPE_LABEL_KEYS[doc.type])} · {formatFileSize(doc.size)} · {doc.uploadedBy.fullName}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon-sm" onClick={() => actions.download.mutate(doc)}>
                                    <DownloadIcon className="size-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => actions.remove.mutate(doc.id)}
                                    disabled={actions.remove.isPending}
                                >
                                    <Trash2Icon className="size-3.5 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}