import {MessageCircle} from "lucide-react";
import {useTranslation} from "react-i18next";

interface WhatsAppLinkProps {
    phone: string;
    className?: string;
}

// SM-B2: the cheapest possible WhatsApp integration — a formatted
// wa.me/{phone} link using the phone already on file, not an embedded inbox.
// Saves retyping or copy-pasting a number to start a chat.
export function WhatsAppLink({phone, className}: WhatsAppLinkProps) {
    const {t} = useTranslation("common");
    const digits = phone.replace(/[^\d]/g, "");

    if (!digits) return null;

    return (
        <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 ${className ?? ""}`}
            aria-label={t("actions.openWhatsApp")}
        >
            <MessageCircle size={14} />
            {t("actions.openWhatsApp")}
        </a>
    );
}
