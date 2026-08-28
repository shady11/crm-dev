import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt";
import {ConfigService} from "@nestjs/config";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtPayload, SessionValidationService} from "../session-validation.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly sessionValidation: SessionValidationService,
    ) {
        const secret = configService.get<string>("JWT_SECRET");

        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthUser> {
        return this.sessionValidation.validate(payload);
    }
}