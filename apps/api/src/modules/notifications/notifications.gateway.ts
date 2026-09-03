import {Injectable, Logger, UnauthorizedException} from "@nestjs/common";
import {OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer} from "@nestjs/websockets";
import {Server, Socket} from "socket.io";
import {JwtService} from "@nestjs/jwt";
import {AuthUser} from "@/common/types/auth-user.type";
import {JwtPayload, SessionValidationService} from "@/modules/auth/session-validation.service";
import {corsOptions} from "@/config/env.config";

@WebSocketGateway({
    namespace: "notifications",
    // Same options object as app.enableCors() in main.ts. Previously this read
    // its own CORS_ORIGIN variable, and read it at decorator-evaluation time —
    // before ConfigModule had loaded .env — so it silently kept the localhost
    // fallback in every deployment.
    cors: corsOptions(),
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly sessionValidation: SessionValidationService,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);
            const decoded = this.jwtService.verify<JwtPayload>(token);
            const user = await this.sessionValidation.validate(decoded);

            client.data.user = user;
            await client.join(`user:${user.id}`);

            this.logger.log(`Client connected: user ${user.id}`);
        } catch {
            this.logger.warn("Rejected unauthenticated socket connection");
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data.user as AuthUser | undefined;
        if (user) this.logger.log(`Client disconnected: user ${user.id}`);
    }

    private extractToken(client: Socket): string {
        const token =
            client.handshake.auth?.token ||
            (client.handshake.headers?.authorization as string | undefined)?.replace("Bearer ", "");

        if (!token) throw new UnauthorizedException("No token provided");
        return token;
    }

    emitToUser(userId: string, event: string, payload: unknown) {
        this.server.to(`user:${userId}`).emit(event, payload);
    }
}