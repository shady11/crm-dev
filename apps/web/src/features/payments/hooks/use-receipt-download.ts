import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "@/components/ui/toast.tsx";
import {downloadDocument} from "@/features/documents/api/documents.api";
import {issueReceipt} from "@/features/payments/api/payments.api.ts";

/** Issues (or fetches) a payment's receipt and downloads the PDF. */
export function useReceiptDownload() {
    const {t} = useTranslation("payments");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({dealId, paymentId}: {dealId: string; paymentId: string}) => {
            const document = await issueReceipt(dealId, paymentId);
            await downloadDocument(document);
            return document;
        },
        // A first receipt is a new file in the deal's documents.
        onSuccess: () => queryClient.invalidateQueries({queryKey: ["documents"]}),
        onError: () => toast.error({title: t("receipt.error")}),
    });
}
