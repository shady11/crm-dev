import {Body, Controller, Get, Post, UseGuards} from "@nestjs/common";
import {AuthService} from "@/modules/auth/auth.service";
import {LoginDto} from "@/modules/auth/dto/login.dto";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("login")
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    async me(@CurrentUser() user: AuthUser) {
        return user;
    }
}