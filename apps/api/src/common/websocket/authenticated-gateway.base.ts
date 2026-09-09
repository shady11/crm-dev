import {Logger} from "@nestjs/common";
import {OnGatewayConnection, OnGatewayDisconnect} from "@nestjs/websockets";
import {Server, Socket} from "socket.io";
import {AuthUser} from "@/common/types/auth-user.type";
import {SocketAuthService} from "@/common/websocket/socket-auth.service";
import {SocketPresenceRegistry} from "@/common/websocket/socket-presence.registry";

// Base class for every JWT-authenticated gateway (notifications today, chat
// later). Holds the parts that must not diverge between them: reject the
// connection unless the handshake carries a valid session, put the socket in
// its own `user:<id>` room so any service can push to a user without knowing
// their socket ids, and keep the shared presence registry in sync.
//
// A subclass only needs `server`, `logger`, and optionally the two hooks
// below for namespace-specific behaviour (e.g. chat broadcasting a
// "user came online" event to open conversations).
export abstract class AuthenticatedGatewayBase implements OnGatewayConnection, OnGatewayDisconnect {
    protected abstract readonly logger: Logger;
    protected abstract readonly server: Server;

    protected constructor(
        private readonly socketAuth: SocketAuthService,
        private readonly presence: SocketPresenceRegistry,
    ) {}

    async handleConnection(client: Socket): Promise<void> {
        try {
            const user = await this.socketAuth.authenticate(client);

            client.data.user = user;
            await client.join(AuthenticatedGatewayBase.userRoom(user.id));
            this.presence.add(user.id, client.id);

            this.logger.log(`Client connected: user ${user.id}`);
            this.onAuthenticatedConnection(client, user);
        } catch {
            this.logger.warn("Rejected unauthenticated socket connection");
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket): void {
        const user = client.data.user as AuthUser | undefined;
        if (!user) return;

        this.presence.remove(user.id, client.id);
        this.logger.log(`Client disconnected: user ${user.id}`);
        this.onAuthenticatedDisconnect(client, user);
    }

    // Overridable hooks, not abstract: most gateways (notifications included)
    // need nothing beyond the connect/disconnect bookkeeping above.
    protected onAuthenticatedConnection(_client: Socket, _user: AuthUser): void {}
    protected onAuthenticatedDisconnect(_client: Socket, _user: AuthUser): void {}

    emitToUser(userId: string, event: string, payload: unknown): void {
        this.server.to(AuthenticatedGatewayBase.userRoom(userId)).emit(event, payload);
    }

    private static userRoom(userId: string): string {
        return `user:${userId}`;
    }
}
