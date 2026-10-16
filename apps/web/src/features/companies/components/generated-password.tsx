import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Clipboard, ClipboardIndicator, ClipboardTrigger, useClipboard} from "@/components/ui/clipboard.tsx";

/**
 * A password shown once (a new company's admin, a reset), with a button
 * that copies it, so nobody has to retype a 24-character string.
 */
export function GeneratedPassword({value}: {value: string}) {
    return (
        <Clipboard value={value} timeout={2000} className="gap-2">
            <code className="bg-muted min-w-0 flex-1 rounded px-3 py-2 font-mono text-base break-all">{value}</code>
            <CopyButton />
        </Clipboard>
    );
}

function CopyButton() {
    const {t} = useTranslation("common");
    const {copied} = useClipboard();
    const label = copied ? t("actions.copied") : t("actions.copy");

    return (
        <ClipboardTrigger asChild>
            <Button type="button" variant="outline" size="icon-lg" aria-label={label} title={label}>
                <ClipboardIndicator className="[&_svg]:size-4" />
            </Button>
        </ClipboardTrigger>
    );
}
