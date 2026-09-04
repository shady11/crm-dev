import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {SheetFooter} from "@/components/ui/sheet";
import {useTranslation} from "react-i18next";

interface BookingFooterProps {
    step: number;
    totalSteps: number;
    isSubmitting?: boolean;
    onBack(): void;
    onNext(): void;
    onSubmit(): void;
}

export function BookingFooter({ step, totalSteps, isSubmitting, onBack, onNext, onSubmit }: BookingFooterProps) {
    const { t } = useTranslation("deals");
    const isLastStep = step === totalSteps - 1;

    return (
        <SheetFooter>
            <Button type="button" variant="secondary" className="flex-1" disabled={isSubmitting} onClick={onBack}>
                {step === 0 ? t("booking.cancel") : t("booking.back")}
            </Button>
            <Button
                type="button"
                className="flex-1"
                disabled={isSubmitting}
                onClick={isLastStep ? onSubmit : onNext}
            >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isLastStep ? t("booking.confirmReservation") : t("booking.next")}
            </Button>
        </SheetFooter>
    );
}