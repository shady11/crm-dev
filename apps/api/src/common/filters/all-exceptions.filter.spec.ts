import {BadRequestException, HttpStatus, NotFoundException} from "@nestjs/common";
import {HttpAdapterHost} from "@nestjs/core";
import {Prisma} from "@/generated/prisma/client";
import {AllExceptionsFilter} from "./all-exceptions.filter";

describe("AllExceptionsFilter", () => {
    let sent: {body: any; status: number};

    const adapterHost = {
        httpAdapter: {
            getRequestUrl: () => "/api/deals",
            reply: (_res: unknown, body: any, status: number) => {
                sent = {body, status};
            },
        },
    } as unknown as HttpAdapterHost;

    const host = {
        switchToHttp: () => ({getRequest: () => ({}), getResponse: () => ({})}),
    } as any;

    const filter = new AllExceptionsFilter(adapterHost);

    const knownRequestError = (code: string, meta?: Record<string, unknown>) =>
        new Prisma.PrismaClientKnownRequestError("raw prisma message", {
            code,
            clientVersion: "7.8.0",
            meta,
        });

    beforeEach(() => {
        sent = undefined as any;
        // The filter logs 5xx deliberately; keep the test output readable.
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it("passes an application exception through with its own status and message", () => {
        filter.catch(new NotFoundException("Deal \"abc\" was not found."), host);

        expect(sent.status).toBe(HttpStatus.NOT_FOUND);
        expect(sent.body.message).toBe('Deal "abc" was not found.');
        expect(sent.body.path).toBe("/api/deals");
    });

    it("joins the array of messages a ValidationPipe produces", () => {
        filter.catch(new BadRequestException(["email must be an email", "password too short"]), host);

        expect(sent.status).toBe(HttpStatus.BAD_REQUEST);
        expect(sent.body.message).toBe("email must be an email, password too short");
    });

    it("maps a unique constraint violation to 409", () => {
        filter.catch(knownRequestError("P2002", {target: ["companyId", "dealNumber"]}), host);

        expect(sent.status).toBe(HttpStatus.CONFLICT);
        expect(sent.body.message).toBe("A record with these details already exists.");
    });

    it("never echoes column names or the raw driver message", () => {
        filter.catch(knownRequestError("P2002", {target: ["passwordHash"]}), host);

        const serialized = JSON.stringify(sent.body);
        expect(serialized).not.toContain("passwordHash");
        expect(serialized).not.toContain("raw prisma message");
    });

    it("maps a missing record to 404 and a foreign key violation to 409", () => {
        filter.catch(knownRequestError("P2025"), host);
        expect(sent.status).toBe(HttpStatus.NOT_FOUND);

        filter.catch(knownRequestError("P2003"), host);
        expect(sent.status).toBe(HttpStatus.CONFLICT);
    });

    it("treats an unrecognised Prisma code as a 500 rather than inventing a 400", () => {
        // Guards the deliberate absence of a catch-all in mapPrismaError: an
        // unknown database failure is our bug and must not be dressed up as the
        // caller's mistake.
        filter.catch(knownRequestError("P9999"), host);

        expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(sent.body.message).toBe("Internal server error");
    });

    it("reduces an arbitrary thrown value to a flat 500", () => {
        filter.catch(new Error("connect ECONNREFUSED 127.0.0.1:5432"), host);

        expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(JSON.stringify(sent.body)).not.toContain("ECONNREFUSED");
    });
});
