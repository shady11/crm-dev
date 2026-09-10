import {UnauthorizedException} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {PrismaService} from "@/database/prisma.service";
import {UsersService} from "@/modules/users/users.service";
import {TotpService} from "@/modules/auth/totp.service";
import {AuthService} from "./auth.service";
import {SessionValidationService, type JwtPayload} from "./session-validation.service";

const configService = {get: jest.fn()} as unknown as ConfigService;

/**
 * Suspending a tenant changes exactly one field on the company row. What makes
 * that actually stop the tenant is this check, on both authentication paths.
 *
 * If it regresses, suspension becomes decorative — the company shows as
 * suspended in the operator's list while its users keep working normally.
 */
describe("company suspension is enforced at auth", () => {
    const payload = {id: "u1", iat: Math.floor(Date.now() / 1000), exp: 0} as JwtPayload;

    const sessionFor = (company: unknown) => {
        const prisma = {
            user: {
                findUnique: jest.fn().mockResolvedValue({
                    id: "u1",
                    email: "manager@crm.dev",
                    fullName: "Aigul",
                    role: "SALES_MANAGER",
                    companyId: "company-1",
                    isActive: true,
                    sessionsValidFrom: new Date(0),
                    company,
                }),
            },
        } as unknown as PrismaService;

        return new SessionValidationService(prisma, configService);
    };

    it.each([
        ["suspended", {suspendedAt: new Date(), deletedAt: null}],
        ["deleted", {suspendedAt: null, deletedAt: new Date()}],
    ])("rejects every request once the company is %s", async (_state, company) => {
        await expect(sessionFor(company).validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it("allows a healthy company", async () => {
        await expect(sessionFor({suspendedAt: null, deletedAt: null}).validate(payload)).resolves.toMatchObject({
            id: "u1",
        });
    });

    it("never applies to a SUPER_ADMIN, who has no company", async () => {
        const prisma = {
            user: {
                findUnique: jest.fn().mockResolvedValue({
                    id: "s1",
                    email: "ops@crm.dev",
                    fullName: "Ops",
                    role: "SUPER_ADMIN",
                    companyId: null,
                    isActive: true,
                    sessionsValidFrom: new Date(0),
                    company: null,
                }),
            },
        } as unknown as PrismaService;

        await expect(
            new SessionValidationService(prisma, configService).validate({...payload, id: "s1"}),
        ).resolves.toMatchObject({role: "SUPER_ADMIN", companyId: null});
    });

    describe("login", () => {
        const PASSWORD = "correct-horse";
        let passwordHash: string;

        beforeAll(async () => {
            passwordHash = await bcrypt.hash(PASSWORD, 10);
        });

        const loginFor = (company: unknown) => {
            const users = {
                findByEmail: jest.fn().mockResolvedValue({
                    id: "u1",
                    email: "manager@crm.dev",
                    fullName: "Aigul",
                    role: "SALES_MANAGER",
                    companyId: "company-1",
                    isActive: true,
                    passwordHash,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    totpEnabled: false,
                    company,
                }),
            } as unknown as UsersService;

            const jwt = {signAsync: jest.fn().mockResolvedValue("token")} as unknown as JwtService;
            const prisma = {user: {update: jest.fn()}} as unknown as PrismaService;
            const totp = new TotpService();

            return new AuthService(users, jwt, prisma, totp);
        };

        it("refuses a suspended tenant and says why", async () => {
            await expect(
                loginFor({suspendedAt: new Date(), deletedAt: null}).login("manager@crm.dev", PASSWORD),
            ).rejects.toThrow(/not active/);
        });

        it("does not leak the tenant's state to a wrong password", async () => {
            // The check sits after password verification precisely so that
            // someone who cannot prove they belong to the tenant learns nothing
            // about it.
            await expect(
                loginFor({suspendedAt: new Date(), deletedAt: null}).login("manager@crm.dev", "wrong"),
            ).rejects.toThrow(/Invalid email or password/);
        });

        it("lets a healthy tenant log in", async () => {
            await expect(
                loginFor({suspendedAt: null, deletedAt: null}).login("manager@crm.dev", PASSWORD),
            ).resolves.toMatchObject({accessToken: "token"});
        });
    });
});
