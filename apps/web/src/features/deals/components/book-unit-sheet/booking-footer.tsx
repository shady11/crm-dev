import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {SheetFooter} from "@/components/ui/sheet";

interface BookingFooterProps {
    step: number;
    totalSteps: number;
    isSubmitting?: boolean;
    onBack(): void;
    onNext(): void;
    onSubmit(): void;
}

export function BookingFooter({ step, totalSteps, isSubmitting, onBack, onNext, onSubmit }: BookingFooterProps) {
    const isLastStep = step === totalSteps - 1;

    return (
        <SheetFooter>
            <Button type="button" variant="secondary" className="flex-1" disabled={isSubmitting} onClick={onBack}>
                {step === 0 ? "Cancel" : "Back"}
            </Button>
            <Button
                type="button"
                className="flex-1"
                disabled={isSubmitting}
                onClick={isLastStep ? onSubmit : onNext}
            >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isLastStep ? "Confirm reservation" : "Next"}
            </Button>
        </SheetFooter>
    );
}