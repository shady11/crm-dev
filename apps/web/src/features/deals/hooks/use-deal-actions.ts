import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast";
import {
    activateDeal,
    cancelDeal,
    completeDeal,
    createPayment,
    type CreatePaymentPayload,
    extendReservation,
    generatePaymentSchedule,
    type GeneratePaymentSchedulePayload,
    reassignDealManager,
    signContract
} from "@/features/deals/api/deals.api";
import {useTranslation} from "react-i18next";

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
        onError: () => toast.error({ title: t("toasts.signError") }),
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
        mutationFn: (managerId: string) => reassignDealManager(dealId, managerId),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: t("reassignDialog.successTitle", { ns: "users" }) });
        },
        onError: () => toast.error({ title: t("reassignDialog.errorTitle", { ns: "users" }) }),
    });

    return { extend, sign, activate, cancel, generateSchedule, recordPayment, complete, reassign };
}