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
  { type: WhatsappTemplateType.WELCOME, name: 'Boas-vindas', content: 'Olá {{customer_name}}! 👋 Bem-vindo ao *{{store_name}}*!\n\n{{store_status_message}}\n\n📋 Faça seu pedido: {{storefront_url}}' },
  { type: WhatsappTemplateType.ORDER_CONFIRMED, name: 'Pedido Confirmado', content: '✅ {{customer_name}}, seu pedido *#{{order_number}}* foi confirmado!\n\n{{items_list}}\n\n💰 *Total: R$ {{total}}*\n💳 Pagamento: {{payment_method}}' },
  { type: WhatsappTemplateType.ORDER_PREPARING, name: 'Pedido em Preparo', content: '👨‍🍳 {{customer_name}}, seu pedido *#{{order_number}}* está sendo preparado!' },
  { type: WhatsappTemplateType.ORDER_READY, name: 'Pedido Pronto', content: '🎉 {{customer_name}}, seu pedido *#{{order_number}}* está pronto!' },
  { type: WhatsappTemplateType.ORDER_OUT_FOR_DELIVERY, name: 'Saiu para Entrega', content: '🛵 {{customer_name}}, seu pedido *#{{order_number}}* saiu para entrega!' },
  { type: WhatsappTemplateType.ORDER_DELIVERED, name: 'Pedido Entregue', content: '📦 {{customer_name}}, seu pedido *#{{order_number}}* foi entregue!\n\nObrigado pela preferência! ⭐' },
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
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayKey = DAY_KEYS[now.getDay()];
    const hours = tenant.business_hours;
    const noHoursConfigured = !hours || Object.keys(hours).length === 0;
    const todayHours = hours?.[dayKey] as any;

    const isOpen = noHoursConfigured ? true : this.checkIsOpen(todayHours, now);
    const todaySchedule = noHoursConfigured
      ? 'Horario livre'
      : todayHours?.open
        ? `${todayHours.openTime || todayHours.open} - ${todayHours.closeTime || todayHours.close}`
        : 'Fechado';

    const closeTime = todayHours?.closeTime || todayHours?.close || '--:--';
    const storeStatusMessage = isOpen
      ? noHoursConfigured
        ? '🟢 Estamos *abertos*!'
        : `🟢 Estamos *abertos* hoje ate as ${closeTime}!`
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

  private checkIsOpen(dayHours: any, now: Date): boolean {
    if (!dayHours) return false;
    // Support both formats: { open: boolean, openTime, closeTime } and { open: "11:00", close: "23:00" }
    const isEnabled = typeof dayHours.open === 'boolean'
      ? dayHours.open
      : typeof dayHours.open === 'string' && dayHours.open.includes(':');
    if (!isEnabled) return false;
    const openTime = dayHours.openTime || (typeof dayHours.open === 'string' ? dayHours.open : null);
    const closeTime = dayHours.closeTime || dayHours.close || null;
    if (!openTime || !closeTime) return true;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const openMin = oh * 60 + om;
    let closeMin = ch * 60 + cm;
    if (closeMin <= openMin) closeMin += 24 * 60;
    const adjusted = currentMinutes < openMin ? currentMinutes + 24 * 60 : currentMinutes;
    return adjusted >= openMin && adjusted < closeMin;
  }

  private getNextOpenLabel(hours: Record<string, any> | null): string {
    if (!hours) return '';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayIdx = now.getDay();
    for (let i = 1; i <= 7; i++) {
      const idx = (todayIdx + i) % 7;
      const day = DAY_KEYS[idx];
      const h = hours[day];
      const isEnabled = typeof h?.open === 'boolean' ? h.open : typeof h?.open === 'string' && h.open.includes(':');
      const openTime = h?.openTime || (typeof h?.open === 'string' ? h.open : null);
      if (isEnabled && openTime) {
        const dayName = DAY_NAMES_PT[day];
        return ` Abrimos ${i === 1 ? 'amanha' : dayName} as ${openTime}.`;
      }
    }
    return '';
  }

  private formatAllHours(hours: Record<string, any> | null): string {
    if (!hours) return 'Horário não definido';
    return DAY_KEYS
      .map((day) => {
        const h = hours[day];
        const label = DAY_NAMES_PT[day];
        const isEnabled = typeof h?.open === 'boolean' ? h.open : typeof h?.open === 'string' && h.open.includes(':');
        const openTime = h?.openTime || (typeof h?.open === 'string' ? h.open : null);
        const closeTime = h?.closeTime || h?.close || null;
        return isEnabled && openTime && closeTime ? `${label}: ${openTime}-${closeTime}` : `${label}: Fechado`;
      })
      .join('\n');
  }
}
