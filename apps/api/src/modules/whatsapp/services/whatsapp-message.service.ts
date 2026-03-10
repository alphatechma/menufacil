import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import {
  WhatsappMessageDirection, WhatsappMessageStatus, WhatsappTemplateType,
  WhatsappInstanceStatus, OrderStatus, PaymentMethod, WEBSOCKET_EVENTS, WEBSOCKET_ROOMS,
} from '@menufacil/shared';
import { EvolutionApiService } from './evolution-api.service';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { EventsGateway } from '../../../websocket/events.gateway';
import { Order } from '../../order/entities/order.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.CREDIT_CARD]: 'Cartao de Credito',
  [PaymentMethod.DEBIT_CARD]: 'Cartao de Debito',
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
    private readonly evolutionApi: EvolutionApiService,
    private readonly instanceService: WhatsappInstanceService,
    private readonly templateService: WhatsappTemplateService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendOrderNotification(order: Order): Promise<void> {
    const templateType = ORDER_STATUS_TO_TEMPLATE[order.status];
    if (!templateType) return;

    const instance = await this.instanceService.getInstanceByTenantId(order.tenant_id);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) return;

    const customerPhone = order.customer?.phone;
    if (!customerPhone) return;

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

      const variables: Record<string, string> = {
        ...tenantVars,
        customer_name: 'Cliente',
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
    const conversations = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.customer_phone', 'phone')
      .addSelect('MAX(m.created_at)', 'last_message_at')
      .addSelect('COUNT(m.id)', 'message_count')
      .where('m.tenant_id = :tenantId', { tenantId })
      .groupBy('m.customer_phone')
      .orderBy('MAX(m.created_at)', 'DESC')
      .getRawMany();

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.messageRepo.findOne({
          where: { tenant_id: tenantId, customer_phone: conv.phone },
          order: { created_at: 'DESC' },
        });
        return {
          phone: conv.phone,
          last_message_at: conv.last_message_at,
          message_count: Number(conv.message_count),
          last_message: lastMessage?.content || '',
          last_direction: lastMessage?.direction,
        };
      }),
    );
    return result;
  }

  async getMessages(tenantId: string, phone: string): Promise<WhatsappMessage[]> {
    return this.messageRepo.find({
      where: { tenant_id: tenantId, customer_phone: phone },
      order: { created_at: 'ASC' },
      take: 100,
    });
  }

  private async saveMessage(
    tenantId: string, phone: string, direction: WhatsappMessageDirection,
    content: string, status: WhatsappMessageStatus,
    templateId?: string, orderId?: string,
  ): Promise<WhatsappMessage> {
    const message = this.messageRepo.create({
      tenant_id: tenantId, customer_phone: phone, direction, content, status,
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
