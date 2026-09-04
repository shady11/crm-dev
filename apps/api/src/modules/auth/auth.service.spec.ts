import {BadRequestException, UnauthorizedException} from "@nestjs/common";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {UserRole} from "@/generated/prisma/client";
import {AuthUser} from "@/common/types/auth-user.type";
import {PrismaService} from "@/database/prisma.service";
import {UsersService} from "@/modules/users/users.service";
import {AuthService} from "./auth.service";

describe("AuthService.changeOwnPassword", () => {
    const CURRENT = "current-password";
    const caller: AuthUser = {
        id: "user-1",
        email: "manager@crm.dev",
        name: "Aigul",
        role: UserRole.SALES_MANAGER,
        companyId: "company-1",
    };

    let passwordHash: string;

    beforeAll(async () => {
        passwordHash = await bcrypt.hash(CURRENT, 10);
    });

    const build = (overrides: Record<string, unknown> = {}) => {
        const record = {
            id: caller.id,
            email: caller.email,
            fullName: caller.name,
            role: caller.role,
            companyId: caller.companyId,
            isActive: true,
            passwordHash,
            ...overrides,
        };

        const update = jest.fn().mockResolvedValue(record);
        const prisma = {user: {update}} as unknown as PrismaService;
        const users = {findByEmail: jest.fn().mockResolvedValue(record)} as unknown as UsersService;
        const jwt = {signAsync: jest.fn().mockResolvedValue("new.jwt.token")} as unknown as JwtService;

        return {service: new AuthService(users, jwt, prisma), update, jwt};
    };

    it("rejects a wrong current password without writing anything", async () => {
        const {service, update} = build();

        await expect(
            service.changeOwnPassword(caller, {currentPassword: "wrong", newPassword: "a-new-password"}),
        ).rejects.toThrow(UnauthorizedException);

        expect(update).not.toHaveBeenCalled();
    });

    it("rejects reusing the current password", async () => {
        const {service, update} = build();

        await expect(
            service.changeOwnPassword(caller, {currentPassword: CURRENT, newPassword: CURRENT}),
        ).rejects.toThrow(BadRequestException);

        expect(update).not.toHaveBeenCalled();
    });

    it("rejects a deactivated account even with the right password", async () => {
        const {service} = build({isActive: false});

        await expect(
            service.changeOwnPassword(caller, {currentPassword: CURRENT, newPassword: "a-new-password"}),
        ).rejects.toThrow(UnauthorizedException);
    });

    it("stores a real hash of the new password, never the plaintext", async () => {
        const {service, update} = build();

        await service.changeOwnPassword(caller, {currentPassword: CURRENT, newPassword: "a-new-password"});

        const written = update.mock.calls[0][0].data.passwordHash;
        expect(written).not.toBe("a-new-password");
        await expect(bcrypt.compare("a-new-password", written)).resolves.toBe(true);
    });

    it("invalidates every existing session", async () => {
        const {service, update} = build();

        await service.changeOwnPassword(caller, {currentPassword: CURRENT, newPassword: "a-new-password"});

        expect(update.mock.calls[0][0].data.sessionsValidFrom).toBeInstanceOf(Date);
    });

    it("returns a fresh token so the caller is not logged out by their own change", async () => {
        // Without this the sessionsValidFrom bump above would invalidate the
        // token the caller is holding, and changing your password would sign
        // you out — which teaches people to avoid doing it.
        const {service, jwt} = build();

        const result = await service.changeOwnPassword(caller, {
            currentPassword: CURRENT,
            newPassword: "a-new-password",
        });

        expect(result.accessToken).toBe("new.jwt.token");
        expect(jwt.signAsync).toHaveBeenCalledWith(
            expect.objectContaining({id: caller.id, role: caller.role, companyId: caller.companyId}),
        );
    });
});
