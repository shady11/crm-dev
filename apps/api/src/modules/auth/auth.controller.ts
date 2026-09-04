import {Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards} from "@nestjs/common";
import {AuthService} from "@/modules/auth/auth.service";
import {LoginDto} from "@/modules/auth/dto/login.dto";
import {ChangePasswordDto} from "@/modules/auth/dto/change-password.dto";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {Throttle} from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Ten attempts per minute per IP. A person mistyping their password stays
    // well inside this; a script working through a password list does not. This
    // endpoint previously accepted unlimited attempts.
    @Throttle({default: {ttl: 60_000, limit: 10}})
    @Post("login")
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    async me(@CurrentUser() user: AuthUser) {
        return user;
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