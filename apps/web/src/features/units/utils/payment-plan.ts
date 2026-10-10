export type PaymentPlanInput = {
    price: number;
    /** Share paid up front, 0–100. 100 means paying in full. */
    downPaymentPercent: number;
    installments: number;
    /** Months between installments. */
    intervalMonths: number;
    /** Day of the first installment, YYYY-MM-DD. */
    firstPaymentDay: string;
};

export type PaymentPlanRow = { order: number; dueDay: string; amount: number };

export type PaymentPlan = {
    downPayment: number;
    financed: number;
    rows: PaymentPlanRow[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export function addMonths(day: string, months: number) {
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(y, m - 1 + months, 1);
    // Clamp to the month's last day, so a 31st doesn't spill into the next month.
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(Math.min(d, last))}`;
}

/**
 * Amounts split the way the API splits a deal's schedule
 * (PaymentScheduleService.generate): equal installments rounded down to the
 * tiyn, the last one taking the remainder, no interest.
 */
export function buildPaymentPlan({price, downPaymentPercent, installments, intervalMonths, firstPaymentDay}: PaymentPlanInput): PaymentPlan {
    const percent = Math.min(100, Math.max(0, downPaymentPercent));
    const downPayment = Math.round(price * percent) / 100;
    const financed = Math.round((price - downPayment) * 100) / 100;
    if (financed <= 0 || installments < 1) return {downPayment: price, financed: 0, rows: []};

    const base = Math.floor((financed / installments) * 100) / 100;
    const rows: PaymentPlanRow[] = [];
    let allocated = 0;
    for (let i = 0; i < installments; i++) {
        const amount = i === installments - 1 ? Math.round((financed - allocated) * 100) / 100 : base;
        allocated += amount;
        rows.push({order: i + 1, dueDay: addMonths(firstPaymentDay, i * intervalMonths), amount});
    }
    return {downPayment, financed, rows};
}

export function addDays(day: Date, days: number) {
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
