import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * ARCH-002: WebSocket JWT Guard.
 * Authenticates real-time connections using the same JWT strategy as the API.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      // Support tokens in both 'auth' payload (Socket.io best practice) or headers
      const authToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!authToken) {
        this.logger.error(
          `WS auth failure: No token provided for client ${client.id}`,
        );
        return false;
      }

      const payload = await this.jwtService.verifyAsync(authToken);

      // Attach user to client data for use in @SubscribeMessage handlers
      client.data.user = payload;

      return true;
    } catch (err) {
      this.logger.error(
        `WS JWT verification failed for client: ${err.message}`,
      );
      throw new WsException('Unauthorized');
    }
  }
}
