import {BadRequestException, Injectable, UnauthorizedException} from "@nestjs/common";
import { UsersService } from "@/modules/users/users.service";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {AuthBranchSummary, AuthCompanySummary, AuthUser} from "@/common/types/auth-user.type";
import {PrismaService} from "@/database/prisma.service";
import {ChangePasswordDto} from "@/modules/auth/dto/change-password.dto";
import {UpdateOwnProfileDto} from "@/modules/auth/dto/update-own-profile.dto";
import {TotpService} from "@/modules/auth/totp.service";

// Failed logins before an account is locked, and how long the lock lasts.
// Configurable per deployment since a small pilot team behind one shared
// office IP trips a low threshold far more easily than a distributed one.
const LOCKOUT_THRESHOLD = Number(process.env.LOGIN_LOCKOUT_THRESHOLD ?? 5);
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

// Shapes a full Prisma Company row down to the subset the client needs -
// used for both the login response and (via SessionValidationService) every
// authenticated request, so the two never quietly drift out of sync.
function toCompanySummary(company: { id: string; name: string; currency: string | null; locale: string | null; timezone: string | null } | null): AuthCompanySummary | null {
    if (!company) return null;
    return {
        id: company.id,
        name: company.name,
        currency: company.currency,
        locale: company.locale,
        timezone: company.timezone,
    };
}

function toBranchSummary(branch: { id: string; name: string; city: string | null } | null): AuthBranchSummary | null {
    if (!branch) return null;
    return {
        id: branch.id,
        name: branch.name,
        city: branch.city,
    };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly totpService: TotpService,
    ) {}

    async login(email: string, password: string, totpCode?: string) {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("User is inactive");
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new UnauthorizedException(
                `Too many failed attempts. Try again after ${user.lockedUntil.toISOString()}.`,
            );
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            await this.registerFailedLogin(user.id, user.failedLoginAttempts);
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.totpEnabled) {
            if (!totpCode || !user.totpSecret || !this.totpService.verify(totpCode, user.totpSecret)) {
                // A wrong/missing TOTP code does not count as a failed
                // password attempt (the password was already right) and is
                // not lockout-eligible on its own — it's a distinct failure
                // the client should prompt for, not a security incident.
                throw new UnauthorizedException("Invalid or missing two-factor code");
            }
        }

        // Checked only after the password is verified, so that the state of a
        // tenant is never disclosed to someone who cannot prove they belong to
        // it. A real user gets an explanation; a stranger guessing passwords
        // still gets "Invalid email or password".
        //
        // SUPER_ADMIN has no company, so this never applies to them.
        if (user.company && (user.company.suspendedAt || user.company.deletedAt)) {
            throw new UnauthorizedException("This company is not active. Contact your administrator.");
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
        }

        const payload: Omit<AuthUser, "company" | "branch"> = {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            companyId: user.companyId,
            branchId: user.branchId,
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                companyId: user.companyId,
                company: toCompanySummary(user.company),
                branchId: user.branchId,
                branch: toBranchSummary(user.branch),
            },
        };
    }

    /**
     * Lets a user rotate their own password. Until now the only way to change a
     * password was PATCH /users/:id/password, restricted to COMPANY_ADMIN — so
     * every pilot user kept a password their admin chose and knew.
     *
     * Bumping sessionsValidFrom invalidates every session, which is the point:
     * if the old password leaked, any session opened with it dies here. That
     * would also kill the caller's own token, so a fresh one is returned and
     * the client swaps it in — otherwise changing your password logs you out,
     * which trains people not to do it.
     */
    async changeOwnPassword(user: AuthUser, dto: ChangePasswordDto) {
        const record = await this.usersService.findByEmail(user.email);

        if (!record || !record.isActive) {
            throw new UnauthorizedException("Session is no longer valid.");
        }

        const currentIsValid = await bcrypt.compare(dto.currentPassword, record.passwordHash);

        if (!currentIsValid) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        if (await bcrypt.compare(dto.newPassword, record.passwordHash)) {
            throw new BadRequestException("The new password must differ from the current one");
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.user.update({
            where: { id: record.id },
            data: { passwordHash, sessionsValidFrom: new Date() },
        });

        const payload: Omit<AuthUser, "company" | "branch"> = {
            id: record.id,
            email: record.email,
            name: record.fullName,
            role: record.role,
            companyId: record.companyId,
            branchId: record.branchId,
        };

        return { accessToken: await this.jwtService.signAsync(payload) };
    }

    /**
     * SM-A1: lets any signed-in user fix their own name/phone — until now the
     * only self-service PATCH was the password one above, so a typo at
     * onboarding meant filing a request with an admin. Deliberately uses
     * UpdateOwnProfileDto rather than UsersService.update()'s admin DTO: role,
     * email, and isActive are not fields this endpoint can ever touch, so it
     * can't be widened into a privilege-escalation path later.
     */
    async updateOwnProfile(user: AuthUser, dto: UpdateOwnProfileDto) {
        const updated = await this.prisma.user.update({
            where: {id: user.id},
            data: {
                fullName: dto.fullName,
                phone: dto.phone,
            },
            select: {id: true, fullName: true, email: true, phone: true, role: true},
        });

        return updated;
    }

    /**
     * Records a wrong password and locks the account once
     * LOCKOUT_THRESHOLD is reached. `currentAttempts` is passed in from the
     * row login() already loaded, rather than re-read here, so this stays a
     * single write instead of a read-then-write race under concurrent
     * attempts — an approximate count is all a lockout needs.
     */
    private async registerFailedLogin(userId: string, currentAttempts: number) {
        const attempts = currentAttempts + 1;
        const lockedUntil =
            attempts >= LOCKOUT_THRESHOLD
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                : null;

        await this.prisma.user.update({
            where: { id: userId },
            data: { failedLoginAttempts: attempts, lockedUntil },
        });
    }

    /**
     * Step 1 of enabling TOTP: generate a secret and hand back an otpauth://
     * URI for the user's authenticator app to scan. Not persisted as
     * "enabled" yet — that only happens once they prove they can generate a
     * valid code with it, in confirmTwoFactor() below. Re-calling this
     * before confirming simply issues a new secret, discarding the old one.
     */
    async beginTwoFactorSetup(user: AuthUser) {
        const secret = this.totpService.generateSecret();

        await this.prisma.user.update({
            where: { id: user.id },
            data: { totpSecret: secret, totpEnabled: false },
        });

        return { secret, otpauthUrl: this.totpService.keyUri(user.email, secret) };
    }

    /**
     * Step 2: the user submits a code generated from the secret above. Only
     * once that verifies does totpEnabled flip on and login() start
     * requiring a code.
     */
    async confirmTwoFactor(user: AuthUser, code: string) {
        const record = await this.usersService.findById(user.id);

        if (!record.totpSecret) {
            throw new BadRequestException("Call /auth/2fa/setup first");
        }

        if (!this.totpService.verify(code, record.totpSecret)) {
            throw new BadRequestException("Invalid two-factor code");
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: true },
        });

        return { success: true };
    }

    /**
     * Turning 2FA off requires the current password, same bar as changing
     * it — an attacker with just a stolen session token cannot silently
     * remove the second factor.
     */
    async disableTwoFactor(user: AuthUser, password: string) {
        const record = await this.usersService.findByEmail(user.email);

        if (!record || !(await bcrypt.compare(password, record.passwordHash))) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: false, totpSecret: null },
        });

        return { success: true };
    }
}