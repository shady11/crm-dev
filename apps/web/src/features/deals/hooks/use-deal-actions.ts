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
    signContract
} from "@/features/deals/api/deals.api";

export function useDealActions(dealId: string) {
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
            toast.success({ title: "Reservation extended" });
        },
        onError: () => toast.error({ title: "Failed to extend reservation" }),
    });

    const sign = useMutation({
        mutationFn: (payload: { contractNumber: string; contractDate: string; note?: string }) =>
            signContract(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Contract signed" });
        },
        onError: () => toast.error({ title: "Failed to sign contract" }),
    });

    const activate = useMutation({
        mutationFn: () => activateDeal(dealId),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Deal activated" });
        },
        onError: () => toast.error({ title: "Failed to activate deal" }),
    });

    const cancel = useMutation({
        mutationFn: (reason?: string) => cancelDeal(dealId, reason),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Deal cancelled" });
        },
        onError: () => toast.error({ title: "Failed to cancel deal" }),
    });

    const generateSchedule = useMutation({
        mutationFn: (payload: GeneratePaymentSchedulePayload) => generatePaymentSchedule(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Payment schedule generated" });
        },
        onError: () => toast.error({ title: "Failed to generate schedule" }),
    });

    const recordPayment = useMutation({
        mutationFn: (payload: CreatePaymentPayload) => createPayment(dealId, payload),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Payment recorded" });
        },
        onError: () => toast.error({ title: "Failed to record payment" }),
    });

    const complete = useMutation({
        mutationFn: () => completeDeal(dealId),
        onSuccess: async () => {
            await invalidate();
            toast.success({ title: "Deal completed" });
        },
        onError: () => toast.error({ title: "Failed to complete deal" }),
    });

    return { extend, sign, activate, cancel, generateSchedule, recordPayment, complete };
}