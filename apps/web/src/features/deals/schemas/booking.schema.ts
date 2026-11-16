import {z} from "zod";

type TFunc = (key: string) => string;

// A function rather than a module-level constant so validation messages can
// be rebuilt in the current language (see book-unit-sheet.tsx, which wraps
// this in a useMemo keyed on `t`).
export function buildBookingSchema(t: TFunc) {
    return z
        .object({
            clientMode: z.enum(["existing", "new"]),

            existingClientId: z.string().optional(),

            newClient: z.object({
                fullName: z.string().trim().optional(),
                phone: z.string().trim().optional(),
                whatsapp: z.string().trim().optional(),
                email: z
                    .email(t("booking.validation.invalidEmail"))
                    .optional()
                    .or(z.literal("")),

                passport: z.string().trim().optional(),
                pin: z.string().trim().optional(),
            }),

            reservation: z.object({
                managerId: z.string().min(1, t("booking.validation.managerRequired")),

                expiresAt: z.date({
                    error: t("booking.validation.expiresRequired"),
                }),

                discountPercent: z.number().min(0).max(100),

                deposit: z.number().min(0),

                // E2E-7: asked, never assumed. Required once there is a deposit.
                depositPaymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MBANK", "OPTIMA", "ELKART", "OTHER"]).optional(),

                financingType: z.enum(["CASH", "INSTALLMENT", "MORTGAGE"]).optional(),

                note: z.string().optional(),
            }),
        })
        .superRefine((data, ctx) => {
            if (data.reservation.deposit > 0 && !data.reservation.depositPaymentMethod) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["reservation", "depositPaymentMethod"],
                    message: t("booking.validation.depositMethodRequired"),
                });
            }

            if (data.clientMode === "existing") {
                if (!data.existingClientId) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["existingClientId"],
                        message: t("booking.validation.selectClient"),
                    });
                }

                return;
            }

            if (!data.newClient.fullName) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["newClient", "fullName"],
                    message: t("booking.validation.fullNameRequired"),
                });
            }

            if (!data.newClient.phone) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["newClient", "phone"],
                    message: t("booking.validation.phoneRequired"),
                });
            }
        });
}

export type BookingSchema = ReturnType<typeof buildBookingSchema>;
export type BookingFormInput = z.input<BookingSchema>;
export type BookingForm = z.infer<BookingSchema>;
