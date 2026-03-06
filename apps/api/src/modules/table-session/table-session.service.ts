import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableSession, SessionStatus } from './entities/table-session.entity';
import { RestaurantTable, TableStatus } from '../table/entities/table.entity';
import { Order } from '../order/entities/order.entity';
import { OpenSessionDto } from './dto/open-session.dto';

@Injectable()
export class TableSessionService {
  constructor(
    @InjectRepository(TableSession)
    private readonly sessionRepo: Repository<TableSession>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async openSession(dto: OpenSessionDto, tenantId: string): Promise<TableSession> {
    const table = await this.tableRepo.findOne({
      where: { id: dto.table_id, tenant_id: tenantId },
    });
    if (!table) throw new NotFoundException('Mesa nao encontrada');

    const existing = await this.sessionRepo.findOne({
      where: { table_id: dto.table_id, tenant_id: tenantId, status: SessionStatus.OPEN },
    });
    if (existing) throw new ConflictException('Esta mesa ja possui uma sessao aberta');

    const session: TableSession = this.sessionRepo.create({
      table_id: dto.table_id,
      tenant_id: tenantId,
      opened_by: dto.opened_by || undefined,
    });

    table.status = TableStatus.OCCUPIED;
    await this.tableRepo.save(table);

    return this.sessionRepo.save(session);
  }

  async closeSession(sessionId: string, tenantId: string): Promise<{ session: TableSession; bill: BillSummary }> {
    const session = await this.findById(sessionId, tenantId);
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Sessao ja esta fechada');
    }

    const bill = await this.getBillSummary(sessionId, tenantId);

    session.status = SessionStatus.CLOSED;
    session.closed_at = new Date();
    await this.sessionRepo.save(session);

    const table = await this.tableRepo.findOne({
      where: { id: session.table_id, tenant_id: tenantId },
    });
    if (table) {
      table.status = TableStatus.AVAILABLE;
      await this.tableRepo.save(table);
    }

    return { session, bill };
  }

  async findById(id: string, tenantId: string): Promise<TableSession> {
    const session = await this.sessionRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['table'],
    });
    if (!session) throw new NotFoundException('Sessao nao encontrada');
    return session;
  }

  async getActiveSession(tableId: string, tenantId: string): Promise<TableSession | null> {
    return this.sessionRepo.findOne({
      where: { table_id: tableId, tenant_id: tenantId, status: SessionStatus.OPEN },
      relations: ['table'],
    });
  }

  async getSessionWithOrders(sessionId: string, tenantId: string): Promise<TableSession & { orders: Order[] }> {
    const session = await this.findById(sessionId, tenantId);
    const orders = await this.orderRepo.find({
      where: { table_session_id: sessionId, tenant_id: tenantId },
      relations: ['items', 'customer'],
      order: { created_at: 'ASC' },
    });
    return Object.assign(session, { orders });
  }

  async transferTable(
    sessionId: string,
    newTableId: string,
    tenantId: string,
  ): Promise<TableSession> {
    const session = await this.findById(sessionId, tenantId);
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Nao e possivel transferir sessao fechada');
    }

    const newTable = await this.tableRepo.findOne({
      where: { id: newTableId, tenant_id: tenantId },
    });
    if (!newTable) throw new NotFoundException('Mesa de destino nao encontrada');

    const existingSession = await this.sessionRepo.findOne({
      where: { table_id: newTableId, tenant_id: tenantId, status: SessionStatus.OPEN },
    });
    if (existingSession) throw new ConflictException('Mesa de destino ja possui sessao aberta');

    // Free old table
    const oldTable = await this.tableRepo.findOne({
      where: { id: session.table_id, tenant_id: tenantId },
    });
    if (oldTable) {
      oldTable.status = TableStatus.AVAILABLE;
      await this.tableRepo.save(oldTable);
    }

    // Move to new table
    session.table_id = newTableId;
    newTable.status = TableStatus.OCCUPIED;
    await this.tableRepo.save(newTable);

    // Update orders to point to new table
    await this.orderRepo.update(
      { table_session_id: sessionId, tenant_id: tenantId },
      { table_id: newTableId },
    );

    return this.sessionRepo.save(session);
  }

  async mergeSessions(
    sourceSessionId: string,
    targetSessionId: string,
    tenantId: string,
  ): Promise<TableSession> {
    const source = await this.findById(sourceSessionId, tenantId);
    const target = await this.findById(targetSessionId, tenantId);

    if (source.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Sessao de origem ja esta fechada');
    }
    if (target.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Sessao de destino ja esta fechada');
    }

    // Move all orders from source to target
    await this.orderRepo.update(
      { table_session_id: sourceSessionId, tenant_id: tenantId },
      { table_session_id: targetSessionId, table_id: target.table_id },
    );

    // Close source session and free table
    source.status = SessionStatus.CLOSED;
    source.closed_at = new Date();
    await this.sessionRepo.save(source);

    const sourceTable = await this.tableRepo.findOne({
      where: { id: source.table_id, tenant_id: tenantId },
    });
    if (sourceTable) {
      sourceTable.status = TableStatus.AVAILABLE;
      await this.tableRepo.save(sourceTable);
    }

    return this.findById(targetSessionId, tenantId);
  }

  async getBillSummary(sessionId: string, tenantId: string): Promise<BillSummary> {
    const session = await this.findById(sessionId, tenantId);
    const orders = await this.orderRepo.find({
      where: { table_session_id: sessionId, tenant_id: tenantId },
      relations: ['items', 'customer'],
    });

    const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      session_id: sessionId,
      table_number: session.table?.number,
      orders: orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer?.name || 'Anonimo',
        customer_id: o.customer_id,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        items: o.items?.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
          total: Number(i.unit_price) * i.quantity,
        })) || [],
      })),
      total,
    };
  }

  async splitBillEqual(
    sessionId: string,
    numberOfPeople: number,
    tenantId: string,
  ): Promise<{ total: number; per_person: number; number_of_people: number }> {
    const bill = await this.getBillSummary(sessionId, tenantId);
    return {
      total: bill.total,
      per_person: Math.ceil((bill.total / numberOfPeople) * 100) / 100,
      number_of_people: numberOfPeople,
    };
  }

  async splitBillByConsumption(
    sessionId: string,
    tenantId: string,
  ): Promise<{ total: number; by_customer: Array<{ customer_id: string; customer_name: string; total: number }> }> {
    const bill = await this.getBillSummary(sessionId, tenantId);
    const byCustomer = new Map<string, { customer_name: string; total: number }>();

    for (const order of bill.orders) {
      const key = order.customer_id || 'anonymous';
      const existing = byCustomer.get(key) || { customer_name: order.customer_name, total: 0 };
      existing.total += order.total;
      byCustomer.set(key, existing);
    }

    return {
      total: bill.total,
      by_customer: Array.from(byCustomer.entries()).map(([customer_id, data]) => ({
        customer_id,
        customer_name: data.customer_name,
        total: Math.round(data.total * 100) / 100,
      })),
    };
  }
}

export interface BillSummary {
  session_id: string;
  table_number?: number;
  orders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    customer_id: string;
    subtotal: number;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  }>;
  total: number;
}
