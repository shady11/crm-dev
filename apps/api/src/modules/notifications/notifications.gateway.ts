import {Injectable, Logger} from "@nestjs/common";
import {WebSocketGateway, WebSocketServer} from "@nestjs/websockets";
import {Server} from "socket.io";
import {corsOptions} from "@/config/env.config";
import {AuthenticatedGatewayBase} from "@/common/websocket/authenticated-gateway.base";
import {SocketAuthService} from "@/common/websocket/socket-auth.service";
import {SocketPresenceRegistry} from "@/common/websocket/socket-presence.registry";

@WebSocketGateway({
    namespace: "notifications",
    // Same options object as app.enableCors() in main.ts. Previously this read
    // its own CORS_ORIGIN variable, and read it at decorator-evaluation time —
    // before ConfigModule had loaded .env — so it silently kept the localhost
    // fallback in every deployment.
    cors: corsOptions(),
})
@Injectable()
export class NotificationsGateway extends AuthenticatedGatewayBase {
    @WebSocketServer()
    protected readonly server: Server;

    protected readonly logger = new Logger(NotificationsGateway.name);

    constructor(socketAuth: SocketAuthService, presence: SocketPresenceRegistry) {
        super(socketAuth, presence);
    }
}
