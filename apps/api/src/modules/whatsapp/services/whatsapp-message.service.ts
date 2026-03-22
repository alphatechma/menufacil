import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw } from 'typeorm';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import {
  WhatsappMessageDirection, WhatsappMessageStatus, WhatsappTemplateType,
  WhatsappInstanceStatus, OrderStatus, PaymentMethod, WEBSOCKET_EVENTS, WEBSOCKET_ROOMS,
  FlowTriggerType, FlowExecutionStatus,
} from '@menufacil/shared';
import { EvolutionApiService } from './evolution-api.service';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { FlowEngineService } from './flow-engine.service';
import { WhatsappFlowService } from './whatsapp-flow.service';
import { EventsGateway } from '../../../websocket/events.gateway';
import { Order } from '../../order/entities/order.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { normalizePhone } from '../../../common/utils/normalize-phone';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
  [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
  [PaymentMethod.PIX]: 'PIX',
};

const ORDER_STATUS_TO_TEMPLATE: Partial<Record<OrderStatus, WhatsappTemplateType>> = {
  [OrderStatus.CONFIRMED]: WhatsappTemplateType.ORDER_CONFIRMED,
  [OrderStatus.PREPARING]: WhatsappTemplateType.ORDER_PREPARING,
  [OrderStatus.READY]: WhatsappTemplateType.ORDER_READY,
  [OrderStatus.OUT_FOR_DELIVERY]: WhatsappTemplateType.ORDER_OUT_FOR_DELIVERY,
  [OrderStatus.DELIVERED]: WhatsappTemplateType.ORDER_DELIVERED,
  [OrderStatus.CANCELLED]: WhatsappTemplateType.ORDER_CANCELLED,
};

@Injectable()
export class WhatsappMessageService {
  private readonly logger = new Logger(WhatsappMessageService.name);

  constructor(
    @InjectRepository(WhatsappMessage)
    private readonly messageRepo: Repository<WhatsappMessage>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly evolutionApi: EvolutionApiService,
    private readonly instanceService: WhatsappInstanceService,
    private readonly templateService: WhatsappTemplateService,
    @Inject(forwardRef(() => FlowEngineService))
    private readonly flowEngine: FlowEngineService,
    private readonly flowService: WhatsappFlowService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendOrderNotification(order: Order): Promise<void> {
    const templateType = ORDER_STATUS_TO_TEMPLATE[order.status];
    if (!templateType) return;

    const instance = await this.instanceService.getInstanceByTenantId(order.tenant_id);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) return;

    const rawPhone = order.customer?.phone;
    if (!rawPhone) return;
    const customerPhone = normalizePhone(rawPhone);

    const template = await this.templateService.findByType(order.tenant_id, templateType);
    if (!template) return;

    const tenant = await this.tenantRepo.findOne({ where: { id: order.tenant_id } });
    const storefrontUrl = `https://menufacil.maistechtecnologia.com.br/${tenant?.slug || ''}`;

    const tenantVars = tenant
      ? this.templateService.buildTenantVariables(tenant, storefrontUrl)
      : { storefront_url: storefrontUrl };

    const itemsList = order.items?.length
      ? order.items.map((i) => `• ${i.quantity}x ${i.product_name}${i.variation_name ? ` (${i.variation_name})` : ''}`).join('\n')
      : '';

    const variables: Record<string, string> = {
      ...tenantVars,
      customer_name: order.customer?.name || 'Cliente',
      order_number: String(order.order_number),
      total: Number(order.total).toFixed(2),
      subtotal: Number(order.subtotal).toFixed(2),
      delivery_fee: Number(order.delivery_fee).toFixed(2),
      discount: Number(order.discount).toFixed(2),
      order_type: order.order_type,
      payment_method: PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '',
      items_list: itemsList,
      items_count: String(order.items?.length || 0),
      notes: order.notes || '',
    };

    const text = this.templateService.renderTemplate(template.content, variables);

    try {
      await this.evolutionApi.sendTextMessage(instance.instance_name, customerPhone, text);
      await this.saveMessage(order.tenant_id, customerPhone, WhatsappMessageDirection.OUTBOUND, text, WhatsappMessageStatus.SENT, template.id, order.id);
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp notification: ${err.message}`);
      await this.saveMessage(order.tenant_id, customerPhone, WhatsappMessageDirection.OUTBOUND, text, WhatsappMessageStatus.FAILED, template.id, order.id);
    }

    // Trigger order_status_changed flows with order context
    try {
      const flows = await this.flowEngine.findActiveFlows(order.tenant_id, 'order_status_changed');
      for (const flow of flows) {
        const triggerConfig = flow.trigger_config || {};
        const statuses = triggerConfig.statuses || [];
        if (statuses.length > 0 && !statuses.includes(order.status)) continue;

        await this.flowEngine.startExecution(flow, customerPhone, {
          payment_method: order.payment_method || '',
          order_number: String(order.order_number),
          total: Number(order.total).toFixed(2),
          order_type: order.order_type || '',
          order_status: order.status,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to trigger order flow: ${err.message}`);
    }
  }

  async sendFreeMessage(tenantId: string, phone: string, content: string): Promise<WhatsappMessage> {
    const instance = await this.instanceService.getInstanceByTenantId(tenantId);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new Error('WhatsApp not connected');
    }

    await this.evolutionApi.sendTextMessage(instance.instance_name, phone, content);
    const saved = await this.saveMessage(tenantId, phone, WhatsappMessageDirection.OUTBOUND, content, WhatsappMessageStatus.SENT);
    this.emitNewMessage(tenantId, saved);
    return saved;
  }

  async handleIncomingMessage(instanceName: string, phone: string, content: string): Promise<void> {
    this.logger.log(`handleIncomingMessage: instance=${instanceName} phone=${phone} content="${content.substring(0, 50)}"`);

    const instance = await this.instanceService.getInstanceByName(instanceName);
    if (!instance) {
      this.logger.warn(`Instance not found: ${instanceName}`);
      return;
    }

    const tenantId = instance.tenant_id;
    const saved = await this.saveMessage(tenantId, phone, WhatsappMessageDirection.INBOUND, content, WhatsappMessageStatus.DELIVERED);
    this.emitNewMessage(tenantId, saved);

    // Check if there's an active flow execution waiting for input
    const activeExecution = await this.flowEngine.getActiveExecution(tenantId, phone);
    if (activeExecution && activeExecution.status === FlowExecutionStatus.WAITING_INPUT) {
      this.logger.log(`Resuming flow execution ${activeExecution.id} with input from ${phone}`);
      await this.flowEngine.handleWaitInputResponse(activeExecution.id, content);
      return;
    }

    if (activeExecution) {
      this.logger.debug(`Active flow execution exists for ${phone}, skipping trigger check`);
      return;
    }

    // Check for matching flows
    const flows = await this.flowService.findActiveByTrigger(tenantId, FlowTriggerType.MESSAGE_RECEIVED);
    for (const flow of flows) {
      const config = flow.trigger_config || {};
      const keywords = config.keywords as string[] | undefined;
      if (keywords?.length) {
        const matches = keywords.some((kw: string) =>
          content.toLowerCase().includes(kw.toLowerCase()),
        );
        if (!matches) continue;
      }
      // Found a matching flow, start execution
      this.logger.log(`Starting flow "${flow.name}" for ${phone}`);
      await this.flowEngine.startExecution(flow, phone, { last_input: content });
      return;
    }

    // No flow matched — fall back to existing welcome template logic
    // Auto-reply with welcome template if no recent outbound message (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOutbound = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.customer_phone = :phone', { phone })
      .andWhere('m.direction = :direction', { direction: WhatsappMessageDirection.OUTBOUND })
      .andWhere('m.created_at > :since', { since: oneDayAgo })
      .getCount();

    this.logger.log(`Recent outbound messages for ${phone}: ${recentOutbound}`);

    if (recentOutbound === 0) {
      // Ensure default templates exist before looking up welcome template
      await this.templateService.seedDefaults(tenantId);
      const welcomeTemplate = await this.templateService.findByType(tenantId, WhatsappTemplateType.WELCOME);

      if (!welcomeTemplate) {
        this.logger.warn(`Welcome template not found or inactive for tenant ${tenantId}`);
        return;
      }

      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      const storefrontUrl = `https://menufacil.maistechtecnologia.com.br/${tenant?.slug || ''}`;
      const tenantVars = tenant
        ? this.templateService.buildTenantVariables(tenant, storefrontUrl)
        : { storefront_url: storefrontUrl };

      const knownCustomer = await this.findCustomerByPhone(tenantId, phone);

      const variables: Record<string, string> = {
        ...tenantVars,
        customer_name: knownCustomer?.name || 'Cliente',
      };
      const text = this.templateService.renderTemplate(welcomeTemplate.content, variables);
      this.logger.log(`Sending welcome message to ${phone}: "${text.substring(0, 80)}"`);

      try {
        await this.evolutionApi.sendTextMessage(instance.instance_name, phone, text);
        const autoReply = await this.saveMessage(tenantId, phone, WhatsappMessageDirection.OUTBOUND, text, WhatsappMessageStatus.SENT, welcomeTemplate.id);
        this.emitNewMessage(tenantId, autoReply);
        this.logger.log(`Welcome message sent successfully to ${phone}`);
      } catch (err: any) {
        this.logger.error(`Failed to send welcome message to ${phone}: ${err.message}`, err.stack);
      }
    } else {
      this.logger.debug(`Skipping welcome for ${phone}: ${recentOutbound} recent outbound messages`);
    }
  }

  async getConversations(tenantId: string): Promise<any[]> {
    const rawConversations = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.customer_phone', 'phone')
      .addSelect('MAX(m.created_at)', 'last_message_at')
      .addSelect('COUNT(m.id)', 'message_count')
      .where('m.tenant_id = :tenantId', { tenantId })
      .groupBy('m.customer_phone')
      .orderBy('MAX(m.created_at)', 'DESC')
      .getRawMany();

    // Deduplicate conversations by normalized phone
    const normalizedMap = new Map<string, { phones: string[]; last_message_at: Date; message_count: number }>();
    for (const conv of rawConversations) {
      const normalized = normalizePhone(conv.phone);
      const existing = normalizedMap.get(normalized);
      if (existing) {
        existing.phones.push(conv.phone);
        existing.message_count += Number(conv.message_count);
        if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
          existing.last_message_at = conv.last_message_at;
        }
      } else {
        normalizedMap.set(normalized, {
          phones: [conv.phone],
          last_message_at: conv.last_message_at,
          message_count: Number(conv.message_count),
        });
      }
    }

    const deduped = Array.from(normalizedMap.entries())
      .sort(([, a], [, b]) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    const result = await Promise.all(
      deduped.map(async ([normalized, conv]) => {
        // Get last message across all phone variants
        const lastMessage = await this.messageRepo.findOne({
          where: { tenant_id: tenantId, customer_phone: In(conv.phones) },
          order: { created_at: 'DESC' },
        });

        const customer = await this.findCustomerByPhone(tenantId, normalized);

        return {
          phone: normalized,
          last_message_at: conv.last_message_at,
          message_count: conv.message_count,
          last_message: lastMessage?.content || '',
          last_direction: lastMessage?.direction,
          customer: customer ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            loyalty_points: customer.loyalty_points,
          } : null,
        };
      }),
    );
    return result;
  }

  async getMessages(tenantId: string, phone: string): Promise<WhatsappMessage[]> {
    const normalized = normalizePhone(phone);

    // Find all phone variants stored in DB that normalize to the same number
    const variants = await this.messageRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.customer_phone', 'phone')
      .where('m.tenant_id = :tenantId', { tenantId })
      .getRawMany();

    const matchingPhones = variants
      .map((v) => v.phone)
      .filter((p) => normalizePhone(p) === normalized);

    if (matchingPhones.length === 0) {
      matchingPhones.push(normalized);
    }

    return this.messageRepo.find({
      where: { tenant_id: tenantId, customer_phone: In(matchingPhones) },
      order: { created_at: 'ASC' },
      take: 100,
    });
  }

  private async findCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    const normalized = normalizePhone(phone);
    const digitsOnly = normalized.replace(/\D/g, '');
    const local = digitsOnly.startsWith('55') ? digitsOnly.slice(2) : digitsOnly;

    return this.customerRepo.findOne({
      where: {
        tenant_id: tenantId,
        phone: Raw(
          (alias) => `REGEXP_REPLACE(${alias}, '[^0-9]', '', 'g') IN (:...phones)`,
          { phones: [digitsOnly, local] },
        ),
      },
    });
  }

  private async saveMessage(
    tenantId: string, phone: string, direction: WhatsappMessageDirection,
    content: string, status: WhatsappMessageStatus,
    templateId?: string, orderId?: string,
  ): Promise<WhatsappMessage> {
    const message = this.messageRepo.create({
      tenant_id: tenantId, customer_phone: normalizePhone(phone), direction, content, status,
      template_id: templateId, order_id: orderId,
    });
    return this.messageRepo.save(message);
  }

  private emitNewMessage(tenantId: string, message: WhatsappMessage) {
    this.eventsGateway.server
      .to(WEBSOCKET_ROOMS.tenantWhatsapp(tenantId))
      .emit(WEBSOCKET_EVENTS.WHATSAPP_MESSAGE_NEW, message);
  }
}
