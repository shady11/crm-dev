/**
 * Single source of truth for environment configuration.
 *
 * Two rules this file exists to enforce:
 *
 * 1. One variable per concern. The HTTP bootstrap and the WebSocket gateway
 *    previously read two *different* variables for the same CORS setting
 *    (FRONTEND_URL and CORS_ORIGIN), so configuring the deployment correctly
 *    for REST silently left sockets pinned to the dev server.
 *
 * 2. Never read process.env at module-import time. ConfigModule loads the .env
 *    file while AppModule is being constructed, which happens *after* decorator
 *    arguments such as @WebSocketGateway({ cors: ... }) have already been
 *    evaluated. A value read there sees `undefined` even when it is set in
 *    .env — it only appears to work when the variable comes from the real
 *    process environment (docker-compose, systemd). Everything below is read
 *    lazily, inside a function, for that reason.
 */

const REQUIRED_ALWAYS = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL"] as const;

/**
 * Only required in production. UPLOADS_DIR has a working default for local
 * development, but on a server that default lands inside the container and
 * every uploaded contract is destroyed by the next redeploy — so there, an
 * explicit path is mandatory.
 */
const REQUIRED_IN_PRODUCTION = ["UPLOADS_DIR"] as const;

/**
 * Only required when STORAGE_DRIVER=s3 — a half-configured S3 driver would
 * otherwise fail on the first upload instead of at boot.
 */
const REQUIRED_FOR_S3_STORAGE = [
    "AWS_S3_BUCKET",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
] as const;

/**
 * Passed to ConfigModule.forRoot({ validate }), which calls this after loading
 * the .env file and before any provider is instantiated. Throwing here stops
 * the process at startup with a readable message, instead of letting it come
 * up half-configured and fail later somewhere unrelated.
 */
export function validateEnv(
    config: Record<string, unknown> = process.env,
): Record<string, unknown> {
    const required = [
        ...REQUIRED_ALWAYS,
        ...(config.NODE_ENV === "production" ? REQUIRED_IN_PRODUCTION : []),
        ...(config.STORAGE_DRIVER === "s3" ? REQUIRED_FOR_S3_STORAGE : []),
    ];

    const missing = required.filter((key) => {
        const value = config[key];
        return typeof value !== "string" || value.trim() === "";
    });

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variable(s): ${missing.join(", ")}. ` +
            `See apps/api/.env.example — the API will not start without them.`,
        );
    }

    return config;
}

/**
 * Origins allowed to call this API from a browser.
 *
 * Comma-separated, because a CRM on a company's own network is commonly reached
 * by more than one name — "https://crm.example.kg" from outside and
 * "http://192.168.1.10" from the office.
 */
export function getAllowedOrigins(): string[] {
    const raw = process.env.FRONTEND_URL?.trim();

    if (!raw) {
        throw new Error(
            "FRONTEND_URL is not set. It must list every origin the web app is " +
            "served from, comma-separated.",
        );
    }

    return raw
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter((origin) => origin.length > 0);
}

type CorsCallback = (err: Error | null, allow?: boolean) => void;

/**
 * Shared by app.enableCors() and the notifications gateway so the two can never
 * drift again. socket.io uses the same `cors` package as Express, so one options
 * object is valid for both.
 */
export function corsOptions() {
    return {
        origin: (requestOrigin: string | undefined, callback: CorsCallback) => {
            // Non-browser callers (health checks, curl, native socket clients)
            // send no Origin header at all; CORS does not apply to them.
            if (!requestOrigin) {
                return callback(null, true);
            }

            const allowed = getAllowedOrigins();
            const normalized = requestOrigin.replace(/\/$/, "");

            return callback(null, allowed.includes(normalized));
        },
        credentials: true,
    };
}
