import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import {HttpAdapterHost} from "@nestjs/core";
import {Prisma} from "@/generated/prisma/client";

type ErrorBody = {
    statusCode: number;
    message: string;
    error?: string;
    path: string;
    timestamp: string;
};

/**
 * Catches everything that reaches the edge and returns a predictable JSON body.
 *
 * The problem this solves: an unhandled Prisma error previously surfaced as a
 * 500 whose message contained the failing query, column names and sometimes the
 * submitted values. That is both a poor error for the user and an information
 * leak to anyone who can reach the API. Known Prisma error codes are mapped to
 * the 4xx they actually represent; anything unrecognised becomes a flat 500 with
 * the detail written to the server log instead of the response.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const {httpAdapter} = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const path = httpAdapter.getRequestUrl(request) ?? "";

        const body = this.toErrorBody(exception, path);

        // 5xx means we did not anticipate this — log the whole thing, including
        // the stack, so it exists somewhere other than the user's browser.
        if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${body.statusCode} ${path}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        }

        httpAdapter.reply(ctx.getResponse(), body, body.statusCode);
    }

    private toErrorBody(exception: unknown, path: string): ErrorBody {
        const timestamp = new Date().toISOString();

        // Anything the application threw deliberately (including every exception
        // in modules/deals/exceptions) already carries the right status and a
        // message written for a user.
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const message =
                typeof response === "string"
                    ? response
                    : ((response as {message?: string | string[]}).message ?? exception.message);

            return {
                statusCode: exception.getStatus(),
                message: Array.isArray(message) ? message.join(", ") : message,
                error: (typeof response === "object"
                    ? (response as {error?: string}).error
                    : undefined) ?? exception.name,
                path,
                timestamp,
            };
        }

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            const mapped = this.mapPrismaError(exception);
            if (mapped) {
                return {...mapped, path, timestamp};
            }
        }

        if (exception instanceof Prisma.PrismaClientValidationError) {
            // A malformed query is our bug, not the caller's — but it is still a
            // bad request from the client's point of view often enough that a 400
            // with no detail is more useful than a 500. The detail is logged.
            this.logger.error("Prisma validation error", exception.message);
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: "The request could not be processed.",
                error: "Bad Request",
                path,
                timestamp,
            };
        }

        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Internal server error",
            error: "Internal Server Error",
            path,
            timestamp,
        };
    }

    /**
     * Only the codes that can realistically reach a user. Deliberately no
     * `default` branch that invents a 400 for unknown codes — an unrecognised
     * database failure is a 500, and pretending otherwise hides real bugs.
     *
     * Note that field names are never echoed back: `meta.target` on a P2002
     * names database columns, which is exactly the sort of schema detail this
     * filter exists to keep out of responses.
     */
    private mapPrismaError(
        exception: Prisma.PrismaClientKnownRequestError,
    ): Pick<ErrorBody, "statusCode" | "message" | "error"> | null {
        switch (exception.code) {
            case "P2002": // unique constraint violation
                return {
                    statusCode: HttpStatus.CONFLICT,
                    message: "A record with these details already exists.",
                    error: "Conflict",
                };

            case "P2025": // required record not found
                return {
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "The requested record was not found.",
                    error: "Not Found",
                };

            case "P2003": // foreign key constraint violation
                return {
                    statusCode: HttpStatus.CONFLICT,
                    message: "This record is referenced by other data and cannot be changed.",
                    error: "Conflict",
                };

            case "P2000": // value too long for the column
            case "P2006": // invalid value for the field
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: "One of the submitted values is not valid.",
                    error: "Bad Request",
                };

            default:
                return null;
        }
    }
}
