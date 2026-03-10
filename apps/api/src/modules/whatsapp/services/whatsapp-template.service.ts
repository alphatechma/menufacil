import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessageTemplate } from '../entities/whatsapp-message-template.entity';
import { WhatsappTemplateType } from '@menufacil/shared';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { Tenant } from '../../tenant/entities/tenant.entity';

const DAY_NAMES_PT: Record<string, string> = {
  sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terca',
  wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sabado',
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_TEMPLATES: { type: WhatsappTemplateType; name: string; content: string }[] = [
  { type: WhatsappTemplateType.WELCOME, name: 'Boas-vindas', content: 'Ola {{customer_name}}! 👋 Bem-vindo ao *{{store_name}}*!\n\n{{store_status_message}}\n\n📋 Faca seu pedido: {{storefront_url}}' },
  { type: WhatsappTemplateType.ORDER_CONFIRMED, name: 'Pedido Confirmado', content: '✅ {{customer_name}}, seu pedido *#{{order_number}}* foi confirmado!\n\n{{items_list}}\n\n💰 *Total: R$ {{total}}*\n💳 Pagamento: {{payment_method}}' },
  { type: WhatsappTemplateType.ORDER_PREPARING, name: 'Pedido em Preparo', content: '👨‍🍳 {{customer_name}}, seu pedido *#{{order_number}}* esta sendo preparado!' },
  { type: WhatsappTemplateType.ORDER_READY, name: 'Pedido Pronto', content: '🎉 {{customer_name}}, seu pedido *#{{order_number}}* esta pronto!' },
  { type: WhatsappTemplateType.ORDER_OUT_FOR_DELIVERY, name: 'Saiu para Entrega', content: '🛵 {{customer_name}}, seu pedido *#{{order_number}}* saiu para entrega!' },
  { type: WhatsappTemplateType.ORDER_DELIVERED, name: 'Pedido Entregue', content: '📦 {{customer_name}}, seu pedido *#{{order_number}}* foi entregue!\n\nObrigado pela preferencia! ⭐' },
  { type: WhatsappTemplateType.ORDER_CANCELLED, name: 'Pedido Cancelado', content: '❌ {{customer_name}}, seu pedido *#{{order_number}}* foi cancelado.' },
];

@Injectable()
export class WhatsappTemplateService {
  constructor(
    @InjectRepository(WhatsappMessageTemplate)
    private readonly templateRepo: Repository<WhatsappMessageTemplate>,
  ) {}

  async findAll(tenantId: string): Promise<WhatsappMessageTemplate[]> {
    return this.templateRepo.find({ where: { tenant_id: tenantId }, order: { type: 'ASC', name: 'ASC' } });
  }

  async findOne(tenantId: string, id: string): Promise<WhatsappMessageTemplate | null> {
    return this.templateRepo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async findByType(tenantId: string, type: WhatsappTemplateType): Promise<WhatsappMessageTemplate | null> {
    return this.templateRepo.findOne({ where: { tenant_id: tenantId, type, is_active: true } });
  }

  async create(tenantId: string, dto: CreateTemplateDto): Promise<WhatsappMessageTemplate> {
    const template = this.templateRepo.create({ ...dto, tenant_id: tenantId });
    return this.templateRepo.save(template);
  }

  async update(tenantId: string, id: string, dto: UpdateTemplateDto): Promise<WhatsappMessageTemplate> {
    await this.templateRepo.update({ id, tenant_id: tenantId }, dto);
    return this.templateRepo.findOneOrFail({ where: { id, tenant_id: tenantId } });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.templateRepo.delete({ id, tenant_id: tenantId });
  }

  async seedDefaults(tenantId: string): Promise<void> {
    const existing = await this.templateRepo.count({ where: { tenant_id: tenantId } });
    if (existing > 0) return;
    const templates = DEFAULT_TEMPLATES.map((t) => this.templateRepo.create({ ...t, tenant_id: tenantId }));
    await this.templateRepo.save(templates);
  }

  renderTemplate(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
  }

  buildTenantVariables(tenant: Tenant, storefrontUrl: string): Record<string, string> {
    const now = new Date();
    const dayKey = DAY_KEYS[now.getDay()];
    const hours = tenant.business_hours;
    const todayHours = hours?.[dayKey];

    const isOpen = this.checkIsOpen(todayHours, now);
    const todaySchedule = todayHours?.open
      ? `${todayHours.openTime} - ${todayHours.closeTime}`
      : 'Fechado';

    const storeStatusMessage = isOpen
      ? `🟢 Estamos *abertos* hoje ate as ${todayHours?.closeTime || '--:--'}!`
      : `🔴 Estamos *fechados* no momento.${this.getNextOpenLabel(hours)}`;

    return {
      store_name: tenant.name || '',
      store_phone: tenant.phone || '',
      store_address: tenant.address || '',
      store_status: isOpen ? 'Aberto' : 'Fechado',
      store_status_message: storeStatusMessage,
      store_hours_today: todaySchedule,
      store_hours: this.formatAllHours(hours),
      next_open: this.getNextOpenLabel(hours),
      storefront_url: storefrontUrl,
    };
  }

  private checkIsOpen(
    dayHours: { open: boolean; openTime: string; closeTime: string } | undefined,
    now: Date,
  ): boolean {
    if (!dayHours?.open || !dayHours.openTime || !dayHours.closeTime) return false;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = dayHours.openTime.split(':').map(Number);
    const [ch, cm] = dayHours.closeTime.split(':').map(Number);
    return currentMinutes >= oh * 60 + om && currentMinutes < ch * 60 + cm;
  }

  private getNextOpenLabel(hours: Record<string, { open: boolean; openTime: string; closeTime: string }> | null): string {
    if (!hours) return '';
    const now = new Date();
    const todayIdx = now.getDay();
    for (let i = 1; i <= 7; i++) {
      const idx = (todayIdx + i) % 7;
      const day = DAY_KEYS[idx];
      const h = hours[day];
      if (h?.open && h.openTime) {
        const dayName = DAY_NAMES_PT[day];
        return ` Abrimos ${i === 1 ? 'amanha' : dayName} as ${h.openTime}.`;
      }
    }
    return '';
  }

  private formatAllHours(hours: Record<string, { open: boolean; openTime: string; closeTime: string }> | null): string {
    if (!hours) return 'Horario nao definido';
    return DAY_KEYS
      .map((day) => {
        const h = hours[day];
        const label = DAY_NAMES_PT[day];
        return h?.open ? `${label}: ${h.openTime}-${h.closeTime}` : `${label}: Fechado`;
      })
      .join('\n');
  }
}
