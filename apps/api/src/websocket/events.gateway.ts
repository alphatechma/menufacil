import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WEBSOCKET_EVENTS, WEBSOCKET_ROOMS } from '@menufacil/shared';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:tenant-orders')
  handleJoinTenantOrders(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    const room = WEBSOCKET_ROOMS.tenantOrders(data.tenantId);
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
  }

  @SubscribeMessage('join:tenant-kds')
  handleJoinTenantKds(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    const room = WEBSOCKET_ROOMS.tenantKds(data.tenantId);
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
  }

  @SubscribeMessage('join:order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const room = WEBSOCKET_ROOMS.order(data.orderId);
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
  }

  emitNewOrder(tenantId: string, order: any) {
    this.server
      .to(WEBSOCKET_ROOMS.tenantOrders(tenantId))
      .emit(WEBSOCKET_EVENTS.ORDER_NEW, order);
  }

  emitOrderStatusUpdate(tenantId: string, orderId: string, order: any) {
    this.server
      .to(WEBSOCKET_ROOMS.tenantOrders(tenantId))
      .emit(WEBSOCKET_EVENTS.ORDER_STATUS_UPDATED, order);

    this.server
      .to(WEBSOCKET_ROOMS.order(orderId))
      .emit(WEBSOCKET_EVENTS.ORDER_TRACKING_UPDATE, order);
  }

  emitKdsNewItem(tenantId: string, item: any) {
    this.server
      .to(WEBSOCKET_ROOMS.tenantKds(tenantId))
      .emit(WEBSOCKET_EVENTS.KDS_NEW_ITEM, item);
  }
}
