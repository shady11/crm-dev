import {z} from "zod";

export const bookingSchema = z
    .object({
        clientMode: z.enum(["existing", "new"]),

        existingClientId: z.string().optional(),

        newClient: z.object({
            fullName: z.string().trim().optional(),
            phone: z.string().trim().optional(),
            whatsapp: z.string().trim().optional(),
            email: z
                .email("Invalid email")
                .optional()
                .or(z.literal("")),

            passport: z.string().trim().optional(),
            pin: z.string().trim().optional(),
        }),

        reservation: z.object({
            managerId: z.string().min(1, "Manager is required"),

            expiresAt: z.date({
                error: "Reservation expiration is required",
            }),

            discountPercent: z.number().min(0).max(100),

            deposit: z.number().min(0),

            note: z.string().optional(),
        }),
    })
    .superRefine((data, ctx) => {
        if (data.clientMode === "existing") {
            if (!data.existingClientId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["existingClientId"],
                    message: "Please select a client.",
                });
            }

            return;
        }

        if (!data.newClient.fullName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newClient", "fullName"],
                message: "Full name is required.",
            });
        }

        if (!data.newClient.phone) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["newClient", "phone"],
                message: "Phone number is required.",
            });
        }
    });

export type BookingFormInput = z.input<typeof bookingSchema>;
export type BookingForm = z.infer<typeof bookingSchema>;