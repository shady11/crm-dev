import {Injectable} from "@nestjs/common";

// In-memory, per-process registry of which users currently hold at least one
// open socket, across every gateway namespace (notifications today, chat
// later). Deliberately not persisted anywhere: presence is only ever "as of
// this process, right now", and a restart correctly forgets it as every
// socket reconnects and re-registers itself.
//
// A single instance is shared by all gateways via WebsocketModule, so "is
// this user online" answers the same way regardless of which namespace
// asks - a chat gateway checking presence will see connections opened
// through the notifications namespace too.
@Injectable()
export class SocketPresenceRegistry {
    private readonly socketIdsByUserId = new Map<string, Set<string>>();

    add(userId: string, socketId: string): void {
        const sockets = this.socketIdsByUserId.get(userId) ?? new Set<string>();
        sockets.add(socketId);
        this.socketIdsByUserId.set(userId, sockets);
    }

    remove(userId: string, socketId: string): void {
        const sockets = this.socketIdsByUserId.get(userId);
        if (!sockets) return;

        sockets.delete(socketId);
        if (sockets.size === 0) this.socketIdsByUserId.delete(userId);
    }

    isOnline(userId: string): boolean {
        return this.socketIdsByUserId.has(userId);
    }

    onlineUserIds(): string[] {
        return [...this.socketIdsByUserId.keys()];
    }
}
