import {useMutation, useQueryClient} from "@tanstack/react-query";
import {isAxiosError} from "axios";
import {toast} from "@/components/ui/toast";
import {
    activateDeal,
    cancelDeal,
    completeDeal,
    createPayment,
    type CreatePaymentPayload,
    extendReservation,
    generateDealDocument,
    type GeneratableDocumentType,
    generatePaymentSchedule,
    type GeneratePaymentSchedulePayload,
    reassignDealManager,
    signContract
} from "@/features/deals/api/deals.api";
import {useTranslation} from "react-i18next";
import {toastWithUndo} from "@/lib/undo-toast.ts";

export function useDealActions(dealId: string) {
    const { t } = useTranslation("deals");
    const queryClient = useQueryClient();

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
        await queryClient.invalidateQueries({ queryKey: ["deals"] });
        await queryClient.invalidateQueries({ queryKey: ["unit"] });
        await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
    };

    const extend = useMutation({
        mutationFn: (reservationExpiresAt: string) => extendReservation(dealId, reservationExpiresAt),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.reservationExtended") });
        },
        onError: () => toast.error({ title: t("toasts.extendError") }),
    });

    const sign = useMutation({
        mutationFn: (payload: { contractNumber: string; contractDate: string; note?: string }) =>
            signContract(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.contractSigned") });
        },
        onError: (error) => {
            // 422 from the API lists the client fields a contract still needs.
            const missing = isAxiosError<{ missing?: string[] }>(error) ? error.response?.data?.missing : undefined;
            toast.error({
                title: t("toasts.signError"),
                description: missing?.length
                    ? t("toasts.signMissingDetails", {
                          fields: missing.map((field) => t(`toasts.clientField.${field}`)).join(", "),
                      })
                    : undefined,
            });
        },
    });

    const activate = useMutation({
        mutationFn: () => activateDeal(dealId),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.dealActivated") });
        },
        onError: () => toast.error({ title: t("toasts.activateError") }),
    });

    const cancel = useMutation({
        mutationFn: (reason?: string) => cancelDeal(dealId, reason),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.dealCancelled") });
        },
        onError: () => toast.error({ title: t("toasts.cancelError") }),
    });

    const generateSchedule = useMutation({
        mutationFn: (payload: GeneratePaymentSchedulePayload) => generatePaymentSchedule(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.scheduleGenerated") });
        },
        onError: () => toast.error({ title: t("toasts.scheduleError") }),
    });

    const recordPayment = useMutation({
        mutationFn: (payload: CreatePaymentPayload) => createPayment(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.paymentRecorded") });
        },
        onError: () => toast.error({ title: t("toasts.paymentError") }),
    });

    const complete = useMutation({
        mutationFn: () => completeDeal(dealId),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("toasts.dealCompleted") });
        },
        onError: () => toast.error({ title: t("toasts.completeError") }),
    });

    // SH-A1: SALES_HEAD moving a deal between their own team's SALES_MANAGERs.
    const reassign = useMutation({
        mutationFn: ({ managerId }: { managerId: string; previousManagerId: string | null }) =>
            reassignDealManager(dealId, managerId),
        onSuccess: async (_data, { previousManagerId }) => {
            await invalidate();
            const title = t("reassignDialog.successTitle", { ns: "users" });
            if (previousManagerId) {
                toastWithUndo({
                    title,
                    undo: () => reassignDealManager(dealId, previousManagerId),
                    onUndone: invalidate,
                });
            } else {
                toast.success({ title });
            }
        },
        onError: () => toast.error({ title: t("reassignDialog.errorTitle", { ns: "users" }) }),
    });

    const generateDocument = useMutation({
        mutationFn: (type: GeneratableDocumentType) => generateDealDocument(dealId, type),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documents", { ownerType: "DEAL", ownerId: dealId }] });
            await queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
            toast.success({ title: t("toasts.documentGenerated") });
        },
        onError: () => toast.error({ title: t("toasts.documentError"), description: t("toasts.tryAgain") }),
    });

    return { extend, sign, activate, cancel, generateSchedule, recordPayment, complete, reassign, generateDocument };
}