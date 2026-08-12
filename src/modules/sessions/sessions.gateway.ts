import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class SessionsGateway {
  @WebSocketServer()
  server: Server;

  emitToSession(sessionId: string, event: string, data: unknown) {
    this.server.emit(`${event}:${sessionId}`, data);
  }
}
