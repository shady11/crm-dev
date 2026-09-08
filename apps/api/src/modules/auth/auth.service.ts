import {BadRequestException, Injectable, UnauthorizedException} from "@nestjs/common";
import { UsersService } from "@/modules/users/users.service";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {AuthBranchSummary, AuthCompanySummary, AuthUser} from "@/common/types/auth-user.type";
import {PrismaService} from "@/database/prisma.service";
import {ChangePasswordDto} from "@/modules/auth/dto/change-password.dto";
import {UpdateOwnProfileDto} from "@/modules/auth/dto/update-own-profile.dto";

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
    ) {}

    async login(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("User is inactive");
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid email or password");
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
}