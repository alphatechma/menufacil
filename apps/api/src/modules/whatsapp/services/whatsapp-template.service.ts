import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessageTemplate } from '../entities/whatsapp-message-template.entity';
import { WhatsappTemplateType } from '@menufacil/shared';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';

const DEFAULT_TEMPLATES: { type: WhatsappTemplateType; name: string; content: string }[] = [
  { type: WhatsappTemplateType.WELCOME, name: 'Boas-vindas', content: 'Ola {{customer_name}}! Bem-vindo ao nosso cardapio digital. Faca seu pedido: {{storefront_url}}' },
  { type: WhatsappTemplateType.ORDER_CONFIRMED, name: 'Pedido Confirmado', content: '{{customer_name}}, seu pedido #{{order_number}} foi confirmado! Valor: R$ {{total}}' },
  { type: WhatsappTemplateType.ORDER_PREPARING, name: 'Pedido em Preparo', content: '{{customer_name}}, seu pedido #{{order_number}} esta sendo preparado!' },
  { type: WhatsappTemplateType.ORDER_READY, name: 'Pedido Pronto', content: '{{customer_name}}, seu pedido #{{order_number}} esta pronto!' },
  { type: WhatsappTemplateType.ORDER_OUT_FOR_DELIVERY, name: 'Saiu para Entrega', content: '{{customer_name}}, seu pedido #{{order_number}} saiu para entrega!' },
  { type: WhatsappTemplateType.ORDER_DELIVERED, name: 'Pedido Entregue', content: '{{customer_name}}, seu pedido #{{order_number}} foi entregue! Obrigado pela preferencia!' },
  { type: WhatsappTemplateType.ORDER_CANCELLED, name: 'Pedido Cancelado', content: '{{customer_name}}, seu pedido #{{order_number}} foi cancelado.' },
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
}
