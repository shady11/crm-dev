import {Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards} from "@nestjs/common";
import {IsString} from "class-validator";
import {AuthService} from "@/modules/auth/auth.service";
import {LoginDto} from "@/modules/auth/dto/login.dto";
import {ChangePasswordDto} from "@/modules/auth/dto/change-password.dto";
import {UpdateOwnProfileDto} from "@/modules/auth/dto/update-own-profile.dto";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {Throttle} from "@nestjs/throttler";

class TwoFactorCodeDto {
    @IsString()
    code!: string;
}

class DisableTwoFactorDto {
    @IsString()
    password!: string;
}

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Ten attempts per minute per IP. A person mistyping their password stays
    // well inside this; a script working through a password list does not. This
    // endpoint previously accepted unlimited attempts. The account itself is
    // also locked after repeated failures — see AuthService.login.
    @Throttle({default: {ttl: 60_000, limit: 10}})
    @Post("login")
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password, dto.totpCode);
    }

    @UseGuards(JwtAuthGuard)
    @Post("2fa/setup")
    async setupTwoFactor(@CurrentUser() user: AuthUser) {
        return this.authService.beginTwoFactorSetup(user);
    }

    @UseGuards(JwtAuthGuard)
    @Post("2fa/enable")
    async enableTwoFactor(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
        return this.authService.confirmTwoFactor(user, dto.code);
    }

    @UseGuards(JwtAuthGuard)
    @Post("2fa/disable")
    async disableTwoFactor(@CurrentUser() user: AuthUser, @Body() dto: DisableTwoFactorDto) {
        return this.authService.disableTwoFactor(user, dto.password);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    async me(@CurrentUser() user: AuthUser) {
        return user;
    }

    // SM-A1: self-service for name/phone, open to every role — narrower than
    // UsersService.update() (no role/email/isActive), so it can't become an
    // admin action in disguise.
    @UseGuards(JwtAuthGuard)
    @Patch("me")
    async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateOwnProfileDto) {
        return this.authService.updateOwnProfile(user, dto);
    }

    // Same tight limit as login: this endpoint also checks a password, so it is
    // just as attractive to someone holding a stolen token.
    @Throttle({default: {ttl: 60_000, limit: 10}})
    @UseGuards(JwtAuthGuard)
    @Patch("me/password")
    @HttpCode(HttpStatus.OK)
    async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
        return this.authService.changeOwnPassword(user, dto);
    }
}