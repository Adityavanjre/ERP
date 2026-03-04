import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

/**
 * ARCH-002: Real-time Collaboration & Analytics Gateway.
 * Enables live comment updates and real-time feed synchronization.
 */
@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'collaboration',
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(CollaborationGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Join a room for a specific resource (e.g., a specific Invoice or Project)
     * to receive live comment updates.
     */
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('joinResource')
    handleJoinResource(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { resourceType: string; resourceId: string }
    ) {
        const room = `${data.resourceType}:${data.resourceId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined discussion room [${room}]`);
        return { status: 'joined', room };
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('leaveResource')
    handleLeaveResource(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { resourceType: string; resourceId: string }
    ) {
        const room = `${data.resourceType}:${data.resourceId}`;
        client.leave(room);
        this.logger.log(`Client ${client.id} left room [${room}]`);
        return { status: 'left', room };
    }

    /**
     * Utility methods for internal services to trigger broadcasts
     */

    broadcastComment(resourceType: string, resourceId: string, comment: any) {
        const room = `${resourceType}:${resourceId}`;
        this.server.to(room).emit('commentAdded', comment);
        this.logger.log(`Broadcast: New comment on [${room}]`);
    }

    broadcastAnalytics(tenantId: string, metric: string, value: any) {
        this.server.to(`tenant:${tenantId}`).emit('metricUpdate', { metric, value, timestamp: new Date() });
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('joinAnalytics')
    handleJoinAnalytics(@ConnectedSocket() client: Socket) {
        const user = client.data.user;
        if (user?.tenantId) {
            client.join(`tenant:${user.tenantId}`);
            this.logger.log(`Client ${client.id} joined analytics feed for tenant ${user.tenantId}`);
        }
    }
}
