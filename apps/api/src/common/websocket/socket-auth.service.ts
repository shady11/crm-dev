import {Injectable, UnauthorizedException} from "@nestjs/common";
import {JwtService} from "@nestjs/jwt";
import {Socket} from "socket.io";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtPayload, SessionValidationService} from "@/modules/auth/session-validation.service";

// Shared by every authenticated gateway (notifications today, chat later) so
// the handshake auth rules - where the token lives, what "valid" means - are
// defined once. A gateway-specific copy would drift the moment one of them
// changed its handshake shape.
@Injectable()
export class SocketAuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly sessionValidation: SessionValidationService,
    ) {}

    async authenticate(client: Socket): Promise<AuthUser> {
        const token = this.extractToken(client);
        const decoded = this.jwtService.verify<JwtPayload>(token);
        return this.sessionValidation.validate(decoded);
    }

    private extractToken(client: Socket): string {
        const token =
            client.handshake.auth?.token ||
            (client.handshake.headers?.authorization as string | undefined)?.replace("Bearer ", "");

        if (!token) throw new UnauthorizedException("No token provided");
        return token;
    }
}
