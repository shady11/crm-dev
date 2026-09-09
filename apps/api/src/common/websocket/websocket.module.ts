import {Module} from "@nestjs/common";
import {AuthModule} from "@/modules/auth/auth.module";
import {SocketAuthService} from "@/common/websocket/socket-auth.service";
import {SocketPresenceRegistry} from "@/common/websocket/socket-presence.registry";

// Infrastructure shared by every socket gateway. NotificationsModule imports
// this today; the future ChatModule imports the same module rather than
// re-declaring JWT handshake auth or a second presence registry.
@Module({
    imports: [AuthModule],
    providers: [SocketAuthService, SocketPresenceRegistry],
    exports: [SocketAuthService, SocketPresenceRegistry],
})
export class WebsocketModule {}
