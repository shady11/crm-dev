import {Module} from "@nestjs/common";
import {UsersModule} from "@/modules/users/users.module";
import {PassportModule} from "@nestjs/passport";
import {JwtModule} from "@nestjs/jwt";
import {AuthController} from "@/modules/auth/auth.controller";
import {AuthService} from "@/modules/auth/auth.service";
import {JwtStrategy} from "@/modules/auth/strategies/jwt.strategy";
import type {StringValue} from "ms";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {PrismaModule} from "@/database/prisma.module";
import {SessionValidationService} from "@/modules/auth/session-validation.service";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");

        if (!secret) {
          throw new Error("JWT_SECRET is not defined");
        }

        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>("JWT_EXPIRES_IN") ||
                "7d") as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SessionValidationService],
  exports: [
      JwtModule
  ]
})
export class AuthModule {}