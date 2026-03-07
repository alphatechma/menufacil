# WhatsApp Integration (Evolution API) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate WhatsApp messaging into MenuFacil via Evolution API — one number per tenant, with auto messages, templates, and mini chat.

**Architecture:** New `whatsapp` NestJS module with 3 entities (Instance, Template, Message), an EvolutionApiService HTTP client, webhook endpoint, and WebSocket broadcasting. Frontend adds a Settings tab + dedicated `/admin/whatsapp` page.

**Tech Stack:** NestJS, TypeORM, Evolution API v2 REST, Socket.IO, React, RTK Query, Tailwind CSS.

---

## Task 1: Shared Enums and Constants

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/constants.ts`

**Step 1: Add WhatsApp enums to shared package**

In `packages/shared/src/enums.ts`, add after `RewardType`:

```typescript
export enum WhatsappInstanceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

export enum WhatsappTemplateType {
  WELCOME = 'welcome',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_READY = 'order_ready',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  MARKETING = 'marketing',
  CUSTOM = 'custom',
}

export enum WhatsappMessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum WhatsappMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}
```

**Step 2: Add WebSocket events and rooms for WhatsApp**

In `packages/shared/src/constants.ts`, add to `WEBSOCKET_EVENTS`:

```typescript
WHATSAPP_MESSAGE_NEW: 'whatsapp:message-new',
WHATSAPP_STATUS_UPDATE: 'whatsapp:status-update',
```

Add to `WEBSOCKET_ROOMS`:

```typescript
tenantWhatsapp: (tenantId: string) => `tenant:${tenantId}:whatsapp`,
```

**Step 3: Rebuild shared package**

Run: `pnpm --filter @menufacil/shared build`

**Step 4: Commit**

```bash
git add packages/shared/src/enums.ts packages/shared/src/constants.ts
git commit -m "feat(shared): add WhatsApp enums and websocket constants"
```

---

## Task 2: Backend Entities

**Files:**
- Create: `apps/api/src/modules/whatsapp/entities/whatsapp-instance.entity.ts`
- Create: `apps/api/src/modules/whatsapp/entities/whatsapp-message-template.entity.ts`
- Create: `apps/api/src/modules/whatsapp/entities/whatsapp-message.entity.ts`

**Step 1: Create WhatsappInstance entity**

```typescript
// apps/api/src/modules/whatsapp/entities/whatsapp-instance.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { WhatsappInstanceStatus } from '@menufacil/shared';

@Entity('whatsapp_instances')
export class WhatsappInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ unique: true })
  instance_name: string;

  @Column({
    type: 'enum',
    enum: WhatsappInstanceStatus,
    default: WhatsappInstanceStatus.DISCONNECTED,
  })
  status: WhatsappInstanceStatus;

  @Column({ nullable: true })
  phone_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Step 2: Create WhatsappMessageTemplate entity**

```typescript
// apps/api/src/modules/whatsapp/entities/whatsapp-message-template.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { WhatsappTemplateType } from '@menufacil/shared';

@Entity('whatsapp_message_templates')
export class WhatsappMessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: WhatsappTemplateType,
  })
  type: WhatsappTemplateType;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Step 3: Create WhatsappMessage entity**

```typescript
// apps/api/src/modules/whatsapp/entities/whatsapp-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { WhatsappMessageTemplate } from './whatsapp-message-template.entity';
import { Order } from '../../order/entities/order.entity';
import { WhatsappMessageDirection, WhatsappMessageStatus } from '@menufacil/shared';

@Entity('whatsapp_messages')
export class WhatsappMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  customer_phone: string;

  @Column({
    type: 'enum',
    enum: WhatsappMessageDirection,
  })
  direction: WhatsappMessageDirection;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: WhatsappMessageStatus,
    default: WhatsappMessageStatus.SENT,
  })
  status: WhatsappMessageStatus;

  @Column({ nullable: true })
  template_id: string;

  @Column({ nullable: true })
  order_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => WhatsappMessageTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: WhatsappMessageTemplate;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
```

**Step 4: Commit**

```bash
git add apps/api/src/modules/whatsapp/entities/
git commit -m "feat(api): add WhatsApp entities (Instance, Template, Message)"
```

---

## Task 3: DTOs

**Files:**
- Create: `apps/api/src/modules/whatsapp/dto/create-template.dto.ts`
- Create: `apps/api/src/modules/whatsapp/dto/update-template.dto.ts`
- Create: `apps/api/src/modules/whatsapp/dto/send-message.dto.ts`

**Step 1: Create DTOs**

```typescript
// apps/api/src/modules/whatsapp/dto/create-template.dto.ts
import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { WhatsappTemplateType } from '@menufacil/shared';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(WhatsappTemplateType)
  type: WhatsappTemplateType;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
```

```typescript
// apps/api/src/modules/whatsapp/dto/update-template.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
```

```typescript
// apps/api/src/modules/whatsapp/dto/send-message.dto.ts
import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phone: string;

  @IsString()
  content: string;
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/dto/
git commit -m "feat(api): add WhatsApp DTOs"
```

---

## Task 4: EvolutionApiService (HTTP Client)

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/evolution-api.service.ts`

**Step 1: Create the Evolution API HTTP client**

This service wraps all calls to the Evolution API v2 REST endpoints.

```typescript
// apps/api/src/modules/whatsapp/services/evolution-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.webhookUrl = this.configService.get<string>('EVOLUTION_WEBHOOK_URL', '');
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`${method} ${url}`);

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      this.logger.error(`Evolution API error: ${res.status} ${errorBody}`);
      throw new Error(`Evolution API error: ${res.status} - ${errorBody}`);
    }

    return res.json() as Promise<T>;
  }

  async createInstance(instanceName: string): Promise<any> {
    return this.request('POST', '/instance/create', {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: false,
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    });
  }

  async connectInstance(instanceName: string): Promise<{ pairingCode?: string; code?: string; base64?: string }> {
    return this.request('GET', `/instance/connect/${instanceName}`);
  }

  async getConnectionState(instanceName: string): Promise<{ instance: { instanceName: string; state: string } }> {
    return this.request('GET', `/instance/connectionState/${instanceName}`);
  }

  async fetchInstance(instanceName: string): Promise<any[]> {
    return this.request('GET', `/instance/fetchInstances?instanceName=${instanceName}`);
  }

  async logoutInstance(instanceName: string): Promise<any> {
    return this.request('DELETE', `/instance/logout/${instanceName}`);
  }

  async deleteInstance(instanceName: string): Promise<any> {
    return this.request('DELETE', `/instance/delete/${instanceName}`);
  }

  async setWebhook(instanceName: string): Promise<any> {
    return this.request('POST', `/webhook/set/${instanceName}`, {
      enabled: true,
      url: this.webhookUrl,
      webhookByEvents: true,
      webhookBase64: false,
      events: [
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'QRCODE_UPDATED',
      ],
    });
  }

  async sendTextMessage(instanceName: string, phone: string, text: string): Promise<any> {
    return this.request('POST', `/message/sendText/${instanceName}`, {
      number: phone,
      text,
      delay: 1000,
      linkPreview: true,
    });
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/evolution-api.service.ts
git commit -m "feat(api): add EvolutionApiService HTTP client"
```

---

## Task 5: WhatsappInstanceService

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts`

**Step 1: Create instance management service**

```typescript
// apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappInstance } from '../entities/whatsapp-instance.entity';
import { WhatsappInstanceStatus } from '@menufacil/shared';
import { EvolutionApiService } from './evolution-api.service';
import { EventsGateway } from '../../../websocket/events.gateway';
import { WEBSOCKET_EVENTS, WEBSOCKET_ROOMS } from '@menufacil/shared';

@Injectable()
export class WhatsappInstanceService {
  private readonly logger = new Logger(WhatsappInstanceService.name);

  constructor(
    @InjectRepository(WhatsappInstance)
    private readonly instanceRepo: Repository<WhatsappInstance>,
    private readonly evolutionApi: EvolutionApiService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async connect(tenantId: string, tenantSlug: string): Promise<{ qrcode?: string; pairingCode?: string; instance: WhatsappInstance }> {
    let instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });

    const instanceName = `menufacil-${tenantSlug}`;

    if (!instance) {
      // Create instance in Evolution API
      await this.evolutionApi.createInstance(instanceName);
      await this.evolutionApi.setWebhook(instanceName);

      instance = this.instanceRepo.create({
        tenant_id: tenantId,
        instance_name: instanceName,
        status: WhatsappInstanceStatus.CONNECTING,
      });
      await this.instanceRepo.save(instance);
    } else if (instance.status === WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp already connected');
    } else {
      // Instance exists but disconnected — reconnect
      instance.status = WhatsappInstanceStatus.CONNECTING;
      await this.instanceRepo.save(instance);
    }

    // Get QR code
    const connectResult = await this.evolutionApi.connectInstance(instanceName);

    return {
      qrcode: connectResult.base64 || connectResult.code,
      pairingCode: connectResult.pairingCode,
      instance,
    };
  }

  async disconnect(tenantId: string): Promise<void> {
    const instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });
    if (!instance) {
      throw new BadRequestException('No WhatsApp instance found');
    }

    try {
      await this.evolutionApi.logoutInstance(instance.instance_name);
      await this.evolutionApi.deleteInstance(instance.instance_name);
    } catch (err) {
      this.logger.warn(`Error disconnecting Evolution API instance: ${err.message}`);
    }

    instance.status = WhatsappInstanceStatus.DISCONNECTED;
    instance.phone_number = null;
    await this.instanceRepo.save(instance);

    this.emitStatusUpdate(tenantId, instance);
  }

  async getStatus(tenantId: string): Promise<{ status: WhatsappInstanceStatus; phone_number: string | null }> {
    const instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });
    if (!instance) {
      return { status: WhatsappInstanceStatus.DISCONNECTED, phone_number: null };
    }

    // Sync status from Evolution API if connecting
    if (instance.status === WhatsappInstanceStatus.CONNECTING) {
      try {
        const state = await this.evolutionApi.getConnectionState(instance.instance_name);
        if (state.instance?.state === 'open') {
          instance.status = WhatsappInstanceStatus.CONNECTED;
          // Fetch phone number
          const instances = await this.evolutionApi.fetchInstance(instance.instance_name);
          if (instances?.[0]?.instance?.owner) {
            instance.phone_number = instances[0].instance.owner.replace('@s.whatsapp.net', '');
          }
          await this.instanceRepo.save(instance);
        }
      } catch {
        // Evolution API might not have the instance yet
      }
    }

    return { status: instance.status, phone_number: instance.phone_number };
  }

  async handleConnectionUpdate(instanceName: string, state: string, phoneNumber?: string): Promise<void> {
    const instance = await this.instanceRepo.findOne({ where: { instance_name: instanceName } });
    if (!instance) return;

    if (state === 'open') {
      instance.status = WhatsappInstanceStatus.CONNECTED;
      if (phoneNumber) {
        instance.phone_number = phoneNumber.replace('@s.whatsapp.net', '');
      }
    } else if (state === 'close') {
      instance.status = WhatsappInstanceStatus.DISCONNECTED;
    }

    await this.instanceRepo.save(instance);
    this.emitStatusUpdate(instance.tenant_id, instance);
  }

  async getInstanceByTenantId(tenantId: string): Promise<WhatsappInstance | null> {
    return this.instanceRepo.findOne({ where: { tenant_id: tenantId } });
  }

  async getInstanceByName(instanceName: string): Promise<WhatsappInstance | null> {
    return this.instanceRepo.findOne({ where: { instance_name: instanceName } });
  }

  private emitStatusUpdate(tenantId: string, instance: WhatsappInstance) {
    this.eventsGateway.server
      .to(WEBSOCKET_ROOMS.tenantWhatsapp(tenantId))
      .emit(WEBSOCKET_EVENTS.WHATSAPP_STATUS_UPDATE, {
        status: instance.status,
        phone_number: instance.phone_number,
      });
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts
git commit -m "feat(api): add WhatsappInstanceService"
```

---

## Task 6: WhatsappTemplateService

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/whatsapp-template.service.ts`

**Step 1: Create template service**

```typescript
// apps/api/src/modules/whatsapp/services/whatsapp-template.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessageTemplate } from '../entities/whatsapp-message-template.entity';
import { WhatsappTemplateType } from '@menufacil/shared';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';

const DEFAULT_TEMPLATES: { type: WhatsappTemplateType; name: string; content: string }[] = [
  {
    type: WhatsappTemplateType.WELCOME,
    name: 'Boas-vindas',
    content: 'Ola {{customer_name}}! Bem-vindo ao nosso cardapio digital. Faca seu pedido: {{storefront_url}}',
  },
  {
    type: WhatsappTemplateType.ORDER_CONFIRMED,
    name: 'Pedido Confirmado',
    content: '{{customer_name}}, seu pedido #{{order_number}} foi confirmado! Valor: R$ {{total}}',
  },
  {
    type: WhatsappTemplateType.ORDER_PREPARING,
    name: 'Pedido em Preparo',
    content: '{{customer_name}}, seu pedido #{{order_number}} esta sendo preparado!',
  },
  {
    type: WhatsappTemplateType.ORDER_READY,
    name: 'Pedido Pronto',
    content: '{{customer_name}}, seu pedido #{{order_number}} esta pronto!',
  },
  {
    type: WhatsappTemplateType.ORDER_OUT_FOR_DELIVERY,
    name: 'Saiu para Entrega',
    content: '{{customer_name}}, seu pedido #{{order_number}} saiu para entrega!',
  },
  {
    type: WhatsappTemplateType.ORDER_DELIVERED,
    name: 'Pedido Entregue',
    content: '{{customer_name}}, seu pedido #{{order_number}} foi entregue! Obrigado pela preferencia!',
  },
  {
    type: WhatsappTemplateType.ORDER_CANCELLED,
    name: 'Pedido Cancelado',
    content: '{{customer_name}}, seu pedido #{{order_number}} foi cancelado.',
  },
];

@Injectable()
export class WhatsappTemplateService {
  constructor(
    @InjectRepository(WhatsappMessageTemplate)
    private readonly templateRepo: Repository<WhatsappMessageTemplate>,
  ) {}

  async findAll(tenantId: string): Promise<WhatsappMessageTemplate[]> {
    return this.templateRepo.find({
      where: { tenant_id: tenantId },
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<WhatsappMessageTemplate | null> {
    return this.templateRepo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async findByType(tenantId: string, type: WhatsappTemplateType): Promise<WhatsappMessageTemplate | null> {
    return this.templateRepo.findOne({ where: { tenant_id: tenantId, type, is_active: true } });
  }

  async create(tenantId: string, dto: CreateTemplateDto): Promise<WhatsappMessageTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      tenant_id: tenantId,
    });
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

    const templates = DEFAULT_TEMPLATES.map((t) =>
      this.templateRepo.create({ ...t, tenant_id: tenantId }),
    );
    await this.templateRepo.save(templates);
  }

  renderTemplate(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/whatsapp-template.service.ts
git commit -m "feat(api): add WhatsappTemplateService with default templates"
```

---

## Task 7: WhatsappMessageService

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/whatsapp-message.service.ts`

**Step 1: Create message service**

```typescript
// apps/api/src/modules/whatsapp/services/whatsapp-message.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import {
  WhatsappMessageDirection,
  WhatsappMessageStatus,
  WhatsappTemplateType,
  WhatsappInstanceStatus,
  OrderStatus,
  WEBSOCKET_EVENTS,
  WEBSOCKET_ROOMS,
} from '@menufacil/shared';
import { EvolutionApiService } from './evolution-api.service';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { EventsGateway } from '../../../websocket/events.gateway';
import { Order } from '../../order/entities/order.entity';

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
    private readonly evolutionApi: EvolutionApiService,
    private readonly instanceService: WhatsappInstanceService,
    private readonly templateService: WhatsappTemplateService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendOrderNotification(order: Order, tenantSlug: string): Promise<void> {
    const templateType = ORDER_STATUS_TO_TEMPLATE[order.status];
    if (!templateType) return;

    const instance = await this.instanceService.getInstanceByTenantId(order.tenant_id);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) return;

    const customerPhone = order.customer?.phone;
    if (!customerPhone) return;

    const template = await this.templateService.findByType(order.tenant_id, templateType);
    if (!template) return;

    const variables: Record<string, string> = {
      customer_name: order.customer?.name || 'Cliente',
      order_number: String(order.order_number),
      total: Number(order.total).toFixed(2),
      order_type: order.order_type,
      storefront_url: `https://menufacil.maistechtecnologia.com.br/${tenantSlug}`,
    };

    const text = this.templateService.renderTemplate(template.content, variables);

    try {
      await this.evolutionApi.sendTextMessage(instance.instance_name, customerPhone, text);

      const message = this.messageRepo.create({
        tenant_id: order.tenant_id,
        customer_phone: customerPhone,
        direction: WhatsappMessageDirection.OUTBOUND,
        content: text,
        status: WhatsappMessageStatus.SENT,
        template_id: template.id,
        order_id: order.id,
      });
      await this.messageRepo.save(message);
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp notification: ${err.message}`);
      const message = this.messageRepo.create({
        tenant_id: order.tenant_id,
        customer_phone: customerPhone,
        direction: WhatsappMessageDirection.OUTBOUND,
        content: text,
        status: WhatsappMessageStatus.FAILED,
        template_id: template.id,
        order_id: order.id,
      });
      await this.messageRepo.save(message);
    }
  }

  async sendFreeMessage(tenantId: string, phone: string, content: string): Promise<WhatsappMessage> {
    const instance = await this.instanceService.getInstanceByTenantId(tenantId);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) {
      throw new Error('WhatsApp not connected');
    }

    await this.evolutionApi.sendTextMessage(instance.instance_name, phone, content);

    const message = this.messageRepo.create({
      tenant_id: tenantId,
      customer_phone: phone,
      direction: WhatsappMessageDirection.OUTBOUND,
      content,
      status: WhatsappMessageStatus.SENT,
    });
    const saved = await this.messageRepo.save(message);

    this.emitNewMessage(tenantId, saved);
    return saved;
  }

  async handleIncomingMessage(instanceName: string, phone: string, content: string): Promise<void> {
    const instance = await this.instanceService.getInstanceByName(instanceName);
    if (!instance) return;

    const tenantId = instance.tenant_id;

    // Save inbound message
    const message = this.messageRepo.create({
      tenant_id: tenantId,
      customer_phone: phone,
      direction: WhatsappMessageDirection.INBOUND,
      content,
      status: WhatsappMessageStatus.DELIVERED,
    });
    const saved = await this.messageRepo.save(message);

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

    if (recentOutbound === 0) {
      const welcomeTemplate = await this.templateService.findByType(tenantId, WhatsappTemplateType.WELCOME);
      if (welcomeTemplate) {
        // Get tenant slug from instance name (menufacil-{slug})
        const tenantSlug = instance.instance_name.replace('menufacil-', '');
        const variables: Record<string, string> = {
          customer_name: 'Cliente',
          storefront_url: `https://menufacil.maistechtecnologia.com.br/${tenantSlug}`,
        };
        const text = this.templateService.renderTemplate(welcomeTemplate.content, variables);

        try {
          await this.evolutionApi.sendTextMessage(instance.instance_name, phone, text);
          const autoReply = this.messageRepo.create({
            tenant_id: tenantId,
            customer_phone: phone,
            direction: WhatsappMessageDirection.OUTBOUND,
            content: text,
            status: WhatsappMessageStatus.SENT,
            template_id: welcomeTemplate.id,
          });
          const savedReply = await this.messageRepo.save(autoReply);
          this.emitNewMessage(tenantId, savedReply);
        } catch (err) {
          this.logger.error(`Failed to send welcome message: ${err.message}`);
        }
      }
    }
  }

  async handleMessageStatusUpdate(instanceName: string, messageId: string, status: string): Promise<void> {
    // Evolution API sends status updates — map to our enum
    // For now we don't track by Evolution message ID, so this is a placeholder
    this.logger.debug(`Message status update: ${instanceName} ${messageId} -> ${status}`);
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

    // Get last message for each conversation
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

  private emitNewMessage(tenantId: string, message: WhatsappMessage) {
    this.eventsGateway.server
      .to(WEBSOCKET_ROOMS.tenantWhatsapp(tenantId))
      .emit(WEBSOCKET_EVENTS.WHATSAPP_MESSAGE_NEW, message);
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/whatsapp-message.service.ts
git commit -m "feat(api): add WhatsappMessageService with auto-reply and conversations"
```

---

## Task 8: WhatsApp Controller and Webhook

**Files:**
- Create: `apps/api/src/modules/whatsapp/whatsapp.controller.ts`

**Step 1: Create the controller**

```typescript
// apps/api/src/modules/whatsapp/whatsapp.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { WhatsappInstanceService } from './services/whatsapp-instance.service';
import { WhatsappTemplateService } from './services/whatsapp-template.service';
import { WhatsappMessageService } from './services/whatsapp-message.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly instanceService: WhatsappInstanceService,
    private readonly templateService: WhatsappTemplateService,
    private readonly messageService: WhatsappMessageService,
  ) {}

  // --- Instance ---

  @Post('instance/connect')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async connect(@Req() req: any) {
    const tenantId = req.tenantId;
    const tenantSlug = req.headers['x-tenant-slug'] || req.tenantSlug;
    return this.instanceService.connect(tenantId, tenantSlug);
  }

  @Post('instance/disconnect')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async disconnect(@Req() req: any) {
    await this.instanceService.disconnect(req.tenantId);
    return { success: true };
  }

  @Get('instance/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async getStatus(@Req() req: any) {
    return this.instanceService.getStatus(req.tenantId);
  }

  // --- Templates ---

  @Get('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async getTemplates(@Req() req: any) {
    // Seed defaults on first access
    await this.templateService.seedDefaults(req.tenantId);
    return this.templateService.findAll(req.tenantId);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async createTemplate(@Req() req: any, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(req.tenantId, dto);
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async updateTemplate(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(req.tenantId, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    await this.templateService.delete(req.tenantId, id);
    return { success: true };
  }

  // --- Conversations / Messages ---

  @Get('conversations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  async getConversations(@Req() req: any) {
    return this.messageService.getConversations(req.tenantId);
  }

  @Get('conversations/:phone')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  async getMessages(@Req() req: any, @Param('phone') phone: string) {
    return this.messageService.getMessages(req.tenantId, phone);
  }

  @Post('messages/send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.messageService.sendFreeMessage(req.tenantId, dto.phone, dto.content);
  }

  // --- Webhook (public, no auth) ---

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    this.logger.debug(`Webhook received: ${JSON.stringify(body).substring(0, 500)}`);

    const event = body.event;
    const instanceName = body.instance;

    if (!instanceName) return { received: true };

    try {
      if (event === 'connection.update') {
        const state = body.data?.state;
        const phoneNumber = body.data?.wid;
        await this.instanceService.handleConnectionUpdate(instanceName, state, phoneNumber);
      }

      if (event === 'messages.upsert') {
        const message = body.data;
        if (message?.key?.fromMe) return { received: true };

        const phone = message?.key?.remoteJid?.replace('@s.whatsapp.net', '');
        const content = message?.message?.conversation
          || message?.message?.extendedTextMessage?.text
          || '';

        if (phone && content) {
          await this.messageService.handleIncomingMessage(instanceName, phone, content);
        }
      }

      if (event === 'qrcode.updated') {
        // QR code updated — could broadcast via WebSocket for real-time QR refresh
        const instance = await this.instanceService.getInstanceByName(instanceName);
        if (instance) {
          const qrcode = body.data?.qrcode;
          if (qrcode) {
            const { WEBSOCKET_ROOMS } = await import('@menufacil/shared');
            this.logger.debug(`QR code updated for ${instanceName}`);
            // Emit QR code update to tenant's WhatsApp room
            const { EventsGateway } = await import('../../../websocket/events.gateway');
          }
        }
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err.message}`);
    }

    return { received: true };
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp.controller.ts
git commit -m "feat(api): add WhatsappController with webhook handler"
```

---

## Task 9: WhatsApp Module and App Registration

**Files:**
- Create: `apps/api/src/modules/whatsapp/whatsapp.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create the module**

```typescript
// apps/api/src/modules/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappInstance } from './entities/whatsapp-instance.entity';
import { WhatsappMessageTemplate } from './entities/whatsapp-message-template.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { EvolutionApiService } from './services/evolution-api.service';
import { WhatsappInstanceService } from './services/whatsapp-instance.service';
import { WhatsappTemplateService } from './services/whatsapp-template.service';
import { WhatsappMessageService } from './services/whatsapp-message.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappInstance, WhatsappMessageTemplate, WhatsappMessage]),
  ],
  controllers: [WhatsappController],
  providers: [
    EvolutionApiService,
    WhatsappInstanceService,
    WhatsappTemplateService,
    WhatsappMessageService,
  ],
  exports: [WhatsappMessageService, WhatsappInstanceService],
})
export class WhatsappModule {}
```

**Step 2: Register in AppModule**

In `apps/api/src/app.module.ts`, add import:

```typescript
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
```

Add `WhatsappModule` to the `imports` array after `QzTrayModule`.

**Step 3: Add env variables to `.env`**

```env
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=your-global-api-key
EVOLUTION_WEBHOOK_URL=https://menufacil.maistechtecnologia.com.br/api/whatsapp/webhook
```

**Step 4: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): register WhatsappModule in AppModule"
```

---

## Task 10: Order Integration — Emit WhatsApp Notifications

**Files:**
- Modify: `apps/api/src/modules/order/order.module.ts`
- Modify: `apps/api/src/modules/order/order.service.ts`

**Step 1: Import WhatsappModule in OrderModule**

In `apps/api/src/modules/order/order.module.ts`, add:

```typescript
import { WhatsappModule } from '../whatsapp/whatsapp.module';
```

Add `WhatsappModule` to the `imports` array.

**Step 2: Inject WhatsappMessageService in OrderService**

In `apps/api/src/modules/order/order.service.ts`:

1. Add import:
```typescript
import { WhatsappMessageService } from '../whatsapp/services/whatsapp-message.service';
```

2. Add to constructor:
```typescript
private readonly whatsappMessageService: WhatsappMessageService,
```

3. After line 273 (`this.eventsGateway.emitOrderStatusUpdate(tenantId, id, updatedOrder);`), add:

```typescript
// Send WhatsApp notification (fire-and-forget)
this.whatsappMessageService
  .sendOrderNotification(updatedOrder, req.headers?.['x-tenant-slug'] || '')
  .catch((err) => this.logger.warn(`WhatsApp notification failed: ${err.message}`));
```

Note: The tenant slug needs to be accessible. Check how tenantId is obtained in `updateStatus` — if it comes from `req.tenantId`, you may need to also pass the slug. Alternatively, look up the tenant slug from the tenant entity. The simplest approach: add a `tenantSlug` parameter to `updateStatus` or look it up from the Tenant entity in the WhatsappMessageService.

**Simpler approach:** In `WhatsappMessageService.sendOrderNotification`, look up the tenant slug from the instance_name (which is `menufacil-{slug}`).

Update `sendOrderNotification` signature to not need tenantSlug:

```typescript
async sendOrderNotification(order: Order): Promise<void> {
  // ... existing code, but derive slug from instance.instance_name
  const instance = await this.instanceService.getInstanceByTenantId(order.tenant_id);
  if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) return;
  const tenantSlug = instance.instance_name.replace('menufacil-', '');
  // ... rest
}
```

Then in OrderService:
```typescript
this.whatsappMessageService
  .sendOrderNotification(updatedOrder)
  .catch((err) => this.logger.warn(`WhatsApp notification failed: ${err.message}`));
```

**Step 3: Commit**

```bash
git add apps/api/src/modules/order/order.module.ts apps/api/src/modules/order/order.service.ts
git commit -m "feat(api): send WhatsApp notification on order status change"
```

---

## Task 11: Permission Seed

**Files:**
- Modify: `apps/api/src/database/seeds/run-seed.ts`

**Step 1: Add WhatsApp permissions to the seed**

Find the permissions section (around line 144) and add a new `whatsapp` group:

```typescript
whatsapp: [
  { key: 'whatsapp:manage', name: 'Gerenciar WhatsApp' },
  { key: 'whatsapp:chat', name: 'Chat WhatsApp' },
],
```

These should be associated to a `whatsapp` system module — or if not module-gated, just add them without a module association.

Since WhatsApp is not plan-gated, add these permissions without a `module_id`. They should be added to the `Administrador` and `Gerente` default roles.

Add `'whatsapp:manage', 'whatsapp:chat'` to the `Administrador` role's `permissionKeys`.
Add `'whatsapp:chat'` to the `Gerente` role's `permissionKeys`.

**Step 2: Commit**

```bash
git add apps/api/src/database/seeds/run-seed.ts
git commit -m "feat(api): add WhatsApp permissions to seed"
```

---

## Task 12: WebSocket Gateway — WhatsApp Room

**Files:**
- Modify: `apps/api/src/websocket/events.gateway.ts`

**Step 1: Add join handler for WhatsApp room**

After the existing `@SubscribeMessage('join:tenant-tables')` handler, add:

```typescript
@SubscribeMessage('join:tenant-whatsapp')
handleJoinTenantWhatsapp(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { tenantId: string },
) {
  const room = WEBSOCKET_ROOMS.tenantWhatsapp(data.tenantId);
  client.join(room);
  this.logger.log(`Client ${client.id} joined ${room}`);
}
```

**Step 2: Commit**

```bash
git add apps/api/src/websocket/events.gateway.ts
git commit -m "feat(api): add WebSocket room for WhatsApp events"
```

---

## Task 13: Frontend — RTK Query Endpoints

**Files:**
- Modify: `apps/web/src/api/adminApi.ts`

**Step 1: Add WhatsApp endpoints**

After the tenant endpoints section, add:

```typescript
// WhatsApp
connectWhatsapp: builder.mutation<{ qrcode?: string; pairingCode?: string; instance: any }, void>({
  query: () => ({ url: '/whatsapp/instance/connect', method: 'POST', meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappStatus'],
}),
disconnectWhatsapp: builder.mutation<void, void>({
  query: () => ({ url: '/whatsapp/instance/disconnect', method: 'POST', meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappStatus'],
}),
getWhatsappStatus: builder.query<{ status: string; phone_number: string | null }, void>({
  query: () => ({ url: '/whatsapp/instance/status', meta: { authContext: 'admin' as const } }),
  providesTags: ['WhatsappStatus'],
}),
getWhatsappTemplates: builder.query<any[], void>({
  query: () => ({ url: '/whatsapp/templates', meta: { authContext: 'admin' as const } }),
  providesTags: ['WhatsappTemplates'],
}),
createWhatsappTemplate: builder.mutation<any, { name: string; type: string; content: string; is_active?: boolean }>({
  query: (body) => ({ url: '/whatsapp/templates', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappTemplates'],
}),
updateWhatsappTemplate: builder.mutation<any, { id: string; data: any }>({
  query: ({ id, data }) => ({ url: `/whatsapp/templates/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappTemplates'],
}),
deleteWhatsappTemplate: builder.mutation<void, string>({
  query: (id) => ({ url: `/whatsapp/templates/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappTemplates'],
}),
getWhatsappConversations: builder.query<any[], void>({
  query: () => ({ url: '/whatsapp/conversations', meta: { authContext: 'admin' as const } }),
  providesTags: ['WhatsappConversations'],
}),
getWhatsappMessages: builder.query<any[], string>({
  query: (phone) => ({ url: `/whatsapp/conversations/${phone}`, meta: { authContext: 'admin' as const } }),
  providesTags: (result, error, phone) => [{ type: 'WhatsappMessages' as const, id: phone }],
}),
sendWhatsappMessage: builder.mutation<any, { phone: string; content: string }>({
  query: (body) => ({ url: '/whatsapp/messages/send', method: 'POST', data: body, meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappConversations'],
}),
```

Also add the new tags to the `tagTypes` array in `baseApi.ts` (or wherever tags are defined): `'WhatsappStatus'`, `'WhatsappTemplates'`, `'WhatsappConversations'`, `'WhatsappMessages'`.

**Step 2: Export the new hooks**

Make sure the generated hooks are exported. RTK Query auto-generates them from the endpoint names.

**Step 3: Commit**

```bash
git add apps/web/src/api/adminApi.ts apps/web/src/api/baseApi.ts
git commit -m "feat(web): add WhatsApp RTK Query endpoints"
```

---

## Task 14: Frontend — WhatsApp Tab in Settings

**Files:**
- Modify: `apps/web/src/pages/admin/Settings.tsx`

**Step 1: Add "WhatsApp" tab**

In `SETTINGS_TABS` array (line 50), add:

```typescript
{ key: 'whatsapp', label: 'WhatsApp' },
```

**Step 2: Add WhatsApp tab content**

Add imports at top:

```typescript
import { MessageCircle, QrCode, Wifi, WifiOff, ExternalLink as LinkIcon } from 'lucide-react';
import { useConnectWhatsappMutation, useDisconnectWhatsappMutation, useGetWhatsappStatusQuery } from '@/api/adminApi';
import { useNavigate } from 'react-router-dom';
```

Add the WhatsApp section in the tab content render (alongside other `activeTab === 'xxx'` blocks):

```tsx
{activeTab === 'whatsapp' && (
  <WhatsappSettingsTab />
)}
```

Create `WhatsappSettingsTab` as an inline component within Settings.tsx (or a separate file if preferred):

```tsx
function WhatsappSettingsTab() {
  const navigate = useNavigate();
  const { data: status, isLoading: statusLoading, refetch } = useGetWhatsappStatusQuery();
  const [connect, { isLoading: connecting, data: connectData }] = useConnectWhatsappMutation();
  const [disconnect, { isLoading: disconnecting }] = useDisconnectWhatsappMutation();

  const isConnected = status?.status === 'connected';
  const isConnecting = status?.status === 'connecting' || connecting;

  // Poll status every 3s when connecting
  useEffect(() => {
    if (!isConnecting) return;
    const interval = setInterval(() => refetch(), 3000);
    return () => clearInterval(interval);
  }, [isConnecting, refetch]);

  return (
    <FormCard title="WhatsApp" description="Conecte seu numero de WhatsApp para enviar mensagens automaticas aos clientes.">
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-3 h-3 rounded-full',
            isConnected ? 'bg-success' : 'bg-gray-300'
          )} />
          <span className="text-sm font-medium text-gray-700">
            {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
          </span>
          {status?.phone_number && (
            <span className="text-sm text-gray-500">({status.phone_number})</span>
          )}
        </div>

        {/* QR Code */}
        {isConnecting && connectData?.qrcode && (
          <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">Escaneie o QR Code com seu WhatsApp</p>
            <img
              src={`data:image/png;base64,${connectData.qrcode}`}
              alt="QR Code WhatsApp"
              className="w-64 h-64 rounded-lg"
            />
            {connectData?.pairingCode && (
              <p className="text-sm text-gray-500">
                Codigo de pareamento: <span className="font-mono font-bold">{connectData.pairingCode}</span>
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={() => connect()}
              loading={connecting}
              disabled={connecting}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => disconnect()}
              loading={disconnecting}
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          )}
        </div>

        {/* Link to WhatsApp page */}
        {isConnected && (
          <button
            onClick={() => navigate('/admin/whatsapp')}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Gerenciar Templates e Conversas
            <LinkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </FormCard>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/admin/Settings.tsx
git commit -m "feat(web): add WhatsApp tab in Settings page"
```

---

## Task 15: Frontend — WhatsApp Page (Templates Tab)

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/WhatsappPage.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/TemplatesTab.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/TemplateFormModal.tsx`

**Step 1: Create WhatsappPage with tabs**

```tsx
// apps/web/src/pages/admin/whatsapp/WhatsappPage.tsx
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import TemplatesTab from './TemplatesTab';
import ConversationsTab from './ConversationsTab';

const TABS = [
  { key: 'conversas', label: 'Conversas' },
  { key: 'templates', label: 'Templates' },
];

export default function WhatsappPage() {
  const [activeTab, setActiveTab] = useState('conversas');

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        icon={MessageCircle}
        backTo="/admin/settings"
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'conversas' && <ConversationsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
    </div>
  );
}
```

**Step 2: Create TemplatesTab**

```tsx
// apps/web/src/pages/admin/whatsapp/TemplatesTab.tsx
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useGetWhatsappTemplatesQuery,
  useUpdateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
} from '@/api/adminApi';
import TemplateFormModal from './TemplateFormModal';

const TYPE_LABELS: Record<string, string> = {
  welcome: 'Boas-vindas',
  order_confirmed: 'Pedido Confirmado',
  order_preparing: 'Em Preparo',
  order_ready: 'Pronto',
  order_out_for_delivery: 'Saiu para Entrega',
  order_delivered: 'Entregue',
  order_cancelled: 'Cancelado',
  marketing: 'Marketing',
  custom: 'Personalizado',
};

const TYPE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  welcome: 'info',
  order_confirmed: 'success',
  order_preparing: 'warning',
  order_ready: 'success',
  order_out_for_delivery: 'info',
  order_delivered: 'success',
  order_cancelled: 'danger',
  marketing: 'default',
  custom: 'default',
};

export default function TemplatesTab() {
  const { data: templates, isLoading } = useGetWhatsappTemplatesQuery();
  const [updateTemplate] = useUpdateWhatsappTemplateMutation();
  const [deleteTemplate] = useDeleteWhatsappTemplateMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {!templates?.length ? (
        <EmptyState title="Nenhum template" description="Crie templates para mensagens automaticas." />
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm">{t.name}</h3>
                    <Badge variant={TYPE_VARIANTS[t.type] || 'default'}>
                      {TYPE_LABELS[t.type] || t.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{t.content}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle
                    checked={t.is_active}
                    onChange={(checked) => updateTemplate({ id: t.id, data: { is_active: checked } })}
                  />
                  <button
                    onClick={() => { setEditingTemplate(t); setFormOpen(true); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(t.id)}
                    className="text-gray-400 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTemplate(null); }}
        template={editingTemplate}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteTemplate(deleteConfirm); setDeleteConfirm(null); }}
        title="Excluir Template"
        message="Tem certeza que deseja excluir este template?"
      />
    </div>
  );
}
```

**Step 3: Create TemplateFormModal**

```tsx
// apps/web/src/pages/admin/whatsapp/TemplateFormModal.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import {
  useCreateWhatsappTemplateMutation,
  useUpdateWhatsappTemplateMutation,
} from '@/api/adminApi';

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'order_confirmed', label: 'Pedido Confirmado' },
  { value: 'order_preparing', label: 'Em Preparo' },
  { value: 'order_ready', label: 'Pronto' },
  { value: 'order_out_for_delivery', label: 'Saiu para Entrega' },
  { value: 'order_delivered', label: 'Entregue' },
  { value: 'order_cancelled', label: 'Cancelado' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'custom', label: 'Personalizado' },
];

const PLACEHOLDERS = [
  '{{customer_name}}',
  '{{order_number}}',
  '{{total}}',
  '{{order_type}}',
  '{{storefront_url}}',
];

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  type: z.string().min(1, 'Tipo obrigatorio'),
  content: z.string().min(1, 'Conteudo obrigatorio'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  template?: any;
}

export default function TemplateFormModal({ open, onClose, template }: Props) {
  const [create, { isLoading: creating }] = useCreateWhatsappTemplateMutation();
  const [update, { isLoading: updating }] = useUpdateWhatsappTemplateMutation();
  const isEditing = !!template;

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'custom', content: '', is_active: true },
  });

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        type: template.type,
        content: template.content,
        is_active: template.is_active,
      });
    } else {
      reset({ name: '', type: 'custom', content: '', is_active: true });
    }
  }, [template, reset]);

  const contentValue = watch('content');

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await update({ id: template.id, data });
    } else {
      await create(data as any);
    }
    onClose();
  };

  // Preview with example values
  const previewText = contentValue
    ?.replace('{{customer_name}}', 'Joao')
    .replace('{{order_number}}', '42')
    .replace('{{total}}', '59.90')
    .replace('{{order_type}}', 'delivery')
    .replace('{{storefront_url}}', 'https://menufacil.../restaurante');

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar Template' : 'Novo Template'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={control} name="name" label="Nome">
          {({ field }) => <Input {...field} placeholder="Nome do template" />}
        </FormField>

        <FormField control={control} name="type" label="Tipo">
          {({ field }) => (
            <Select {...field}>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField control={control} name="content" label="Conteudo">
          {({ field }) => <Textarea {...field} rows={4} placeholder="Digite a mensagem..." />}
        </FormField>

        <div className="text-xs text-gray-500">
          Variaveis disponiveis: {PLACEHOLDERS.map((p) => (
            <code key={p} className="bg-gray-100 px-1 py-0.5 rounded mx-0.5">{p}</code>
          ))}
        </div>

        {contentValue && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-green-700 font-medium mb-1">Preview:</p>
            <p className="text-sm text-green-900">{previewText}</p>
          </div>
        )}

        <FormField control={control} name="is_active" label="Ativo">
          {({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={creating || updating}>
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/
git commit -m "feat(web): add WhatsApp templates page with form modal"
```

---

## Task 16: Frontend — Conversations Tab (Mini Chat)

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/ConversationsTab.tsx`

**Step 1: Create the conversations/chat component**

```tsx
// apps/web/src/pages/admin/whatsapp/ConversationsTab.tsx
import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import {
  useGetWhatsappConversationsQuery,
  useGetWhatsappMessagesQuery,
  useSendWhatsappMessageMutation,
} from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
import { io } from 'socket.io-client';
import { WEBSOCKET_EVENTS } from '@menufacil/shared';

export default function ConversationsTab() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[400px]">
      {/* Conversation list */}
      <Card className={cn(
        'w-80 shrink-0 overflow-y-auto',
        selectedPhone && 'hidden lg:block'
      )}>
        <ConversationList
          selectedPhone={selectedPhone}
          onSelect={setSelectedPhone}
        />
      </Card>

      {/* Chat area */}
      <Card className={cn(
        'flex-1 flex flex-col',
        !selectedPhone && 'hidden lg:flex'
      )}>
        {selectedPhone ? (
          <ChatArea phone={selectedPhone} onBack={() => setSelectedPhone(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Selecione uma conversa"
              description="Escolha uma conversa na lista ao lado para ver as mensagens."
              icon={MessageCircle}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function ConversationList({ selectedPhone, onSelect }: { selectedPhone: string | null; onSelect: (phone: string) => void }) {
  const { data: conversations, isLoading } = useGetWhatsappConversationsQuery();

  if (isLoading) return <div className="p-4"><Spinner /></div>;

  if (!conversations?.length) {
    return (
      <div className="p-4">
        <EmptyState title="Sem conversas" description="As conversas aparecerao aqui." />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv: any) => (
        <button
          key={conv.phone}
          onClick={() => onSelect(conv.phone)}
          className={cn(
            'w-full text-left p-4 hover:bg-gray-50 transition-colors',
            selectedPhone === conv.phone && 'bg-primary-50'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-gray-900">{conv.phone}</span>
            <span className="text-xs text-gray-400">
              {new Date(conv.last_message_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {conv.last_direction === 'outbound' && 'Voce: '}
            {conv.last_message}
          </p>
        </button>
      ))}
    </div>
  );
}

function ChatArea({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { data: messages, isLoading, refetch } = useGetWhatsappMessagesQuery(phone);
  const [sendMessage, { isLoading: sending }] = useSendWhatsappMessageMutation();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tenantId = useAppSelector((state) => state.adminAuth.user?.tenant_id);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time messages via WebSocket
  useEffect(() => {
    if (!tenantId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(apiUrl, { transports: ['websocket'] });
    socket.emit('join:tenant-whatsapp', { tenantId });

    socket.on(WEBSOCKET_EVENTS.WHATSAPP_MESSAGE_NEW, (msg: any) => {
      if (msg.customer_phone === phone) {
        refetch();
      }
    });

    return () => { socket.disconnect(); };
  }, [tenantId, phone, refetch]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    await sendMessage({ phone, content: text });
    refetch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="lg:hidden text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <MessageCircle className="w-5 h-5 text-primary" />
        <span className="font-medium text-gray-900">{phone}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.map((msg: any) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-2',
              msg.direction === 'outbound'
                ? 'ml-auto bg-primary text-white'
                : 'mr-auto bg-gray-100 text-gray-900'
            )}
          >
            <p className="text-sm">{msg.content}</p>
            <p className={cn(
              'text-xs mt-1',
              msg.direction === 'outbound' ? 'text-white/70' : 'text-gray-400'
            )}>
              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            loading={sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/ConversationsTab.tsx
git commit -m "feat(web): add WhatsApp conversations mini chat"
```

---

## Task 17: Frontend — Route and Sidebar

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

**Step 1: Add route**

In `apps/web/src/App.tsx`:

1. Add lazy import at top:
```typescript
const WhatsappPage = lazy(() => import('@/pages/admin/whatsapp/WhatsappPage'));
```

2. Add route after `<Route path="settings" ...>` (line 121):
```tsx
<Route path="whatsapp" element={<WhatsappPage />} />
```

**Step 2: Add sidebar entry**

In `apps/web/src/components/layout/AdminLayout.tsx`:

1. Add `MessageCircle` to the lucide-react imports (line 3).

2. In the `marketing` sidebar group (line 113-119), add a new item:
```typescript
{ to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp', module: null, permission: 'whatsapp:chat' },
```

This adds WhatsApp under the "Marketing" group in the sidebar.

**Step 3: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat(web): add WhatsApp route and sidebar entry"
```

---

## Task 18: Verification and Testing

**Step 1: Build shared package**

```bash
pnpm --filter @menufacil/shared build
```

**Step 2: Build API**

```bash
cd apps/api && pnpm build
```

Expected: No TypeScript errors.

**Step 3: Build Web**

```bash
cd apps/web && pnpm build
```

Expected: No TypeScript errors.

**Step 4: Start API and verify entities sync**

Since `synchronize: true` is on in dev, starting the API should auto-create the `whatsapp_instances`, `whatsapp_message_templates`, and `whatsapp_messages` tables.

```bash
cd apps/api && pnpm start:dev
```

Check logs for successful table creation.

**Step 5: Test endpoints manually**

Using curl or Insomnia:

1. `POST /api/whatsapp/instance/connect` — Should create instance in Evolution API and return QR code
2. `GET /api/whatsapp/instance/status` — Should return connection status
3. `GET /api/whatsapp/templates` — Should seed and return default templates
4. `POST /api/whatsapp/templates` — Should create a new template
5. `POST /api/whatsapp/webhook` — Should accept webhook payloads

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: WhatsApp integration with Evolution API - complete"
```
