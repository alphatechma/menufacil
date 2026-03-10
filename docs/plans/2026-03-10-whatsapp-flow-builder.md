# WhatsApp Flow Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a visual flow builder (React Flow + Bull Queue) that lets tenants create automated WhatsApp conversation flows with triggers, conditions, actions, and delays.

**Architecture:** React Flow editor on the frontend saves flow graphs as JSON (nodes + edges). NestJS backend stores flows in PostgreSQL and executes them via a Bull Queue engine that processes nodes sequentially, handling delays, wait-for-input, and scheduled triggers.

**Tech Stack:** React Flow (@xyflow/react), Bull Queue (@nestjs/bull + bull), Redis (already deployed), NestJS, TypeORM, RTK Query, Tailwind CSS.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`

**Step 1: Install backend dependencies**

```bash
cd apps/api && pnpm add @nestjs/bull bull
cd apps/api && pnpm add -D @types/bull
```

**Step 2: Install frontend dependencies**

```bash
cd apps/web && pnpm add @xyflow/react
```

**Step 3: Verify install**

```bash
pnpm install
```

**Step 4: Commit**

```bash
git add apps/api/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add @xyflow/react and @nestjs/bull dependencies"
```

---

### Task 2: Add Shared Enums and Types

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/types.ts`

**Step 1: Add enums to shared package**

In `packages/shared/src/enums.ts`, add:

```typescript
export enum FlowTriggerType {
  MESSAGE_RECEIVED = 'message_received',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  SCHEDULED = 'scheduled',
  NEW_CUSTOMER = 'new_customer',
}

export enum FlowNodeType {
  TRIGGER = 'trigger',
  SEND_MESSAGE = 'send_message',
  SEND_MEDIA = 'send_media',
  SEND_MENU_LINK = 'send_menu_link',
  WAIT_INPUT = 'wait_input',
  DELAY = 'delay',
  CONDITION = 'condition',
  CHECK_HOURS = 'check_hours',
  CHECK_CUSTOMER = 'check_customer',
  LOOKUP_ORDER = 'lookup_order',
  TRANSFER_HUMAN = 'transfer_human',
}

export enum FlowExecutionStatus {
  RUNNING = 'running',
  WAITING_INPUT = 'waiting_input',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

**Step 2: Rebuild shared package**

```bash
cd packages/shared && pnpm build
```

**Step 3: Commit**

```bash
git add packages/shared/
git commit -m "feat: add flow builder enums to shared package"
```

---

### Task 3: Create Backend Entities

**Files:**
- Create: `apps/api/src/modules/whatsapp/entities/whatsapp-flow.entity.ts`
- Create: `apps/api/src/modules/whatsapp/entities/whatsapp-flow-execution.entity.ts`

**Step 1: Create WhatsappFlow entity**

```typescript
// apps/api/src/modules/whatsapp/entities/whatsapp-flow.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { FlowTriggerType } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('whatsapp_flows')
export class WhatsappFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FlowTriggerType })
  trigger_type: FlowTriggerType;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  trigger_config: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  nodes: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  edges: any[];

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Step 2: Create WhatsappFlowExecution entity**

```typescript
// apps/api/src/modules/whatsapp/entities/whatsapp-flow-execution.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { FlowExecutionStatus } from '@menufacil/shared';
import { WhatsappFlow } from './whatsapp-flow.entity';

@Entity('whatsapp_flow_executions')
export class WhatsappFlowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flow_id: string;

  @Column()
  tenant_id: string;

  @Column()
  customer_phone: string;

  @Column({ type: 'enum', enum: FlowExecutionStatus, default: FlowExecutionStatus.RUNNING })
  status: FlowExecutionStatus;

  @Column({ nullable: true })
  current_node_id: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  context: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => WhatsappFlow)
  @JoinColumn({ name: 'flow_id' })
  flow: WhatsappFlow;
}
```

**Step 3: Commit**

```bash
git add apps/api/src/modules/whatsapp/entities/
git commit -m "feat: add WhatsappFlow and WhatsappFlowExecution entities"
```

---

### Task 4: Create Flow DTOs and CRUD Service

**Files:**
- Create: `apps/api/src/modules/whatsapp/dto/create-flow.dto.ts`
- Create: `apps/api/src/modules/whatsapp/dto/update-flow.dto.ts`
- Create: `apps/api/src/modules/whatsapp/services/whatsapp-flow.service.ts`

**Step 1: Create DTOs**

```typescript
// apps/api/src/modules/whatsapp/dto/create-flow.dto.ts
import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';
import { FlowTriggerType } from '@menufacil/shared';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsEnum(FlowTriggerType)
  trigger_type: FlowTriggerType;

  @IsOptional()
  trigger_config?: Record<string, any>;

  @IsOptional()
  @IsArray()
  nodes?: any[];

  @IsOptional()
  @IsArray()
  edges?: any[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}
```

```typescript
// apps/api/src/modules/whatsapp/dto/update-flow.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateFlowDto } from './create-flow.dto';

export class UpdateFlowDto extends PartialType(CreateFlowDto) {}
```

**Step 2: Create CRUD service**

```typescript
// apps/api/src/modules/whatsapp/services/whatsapp-flow.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappFlow } from '../entities/whatsapp-flow.entity';
import { CreateFlowDto } from '../dto/create-flow.dto';
import { UpdateFlowDto } from '../dto/update-flow.dto';
import { FlowTriggerType } from '@menufacil/shared';

@Injectable()
export class WhatsappFlowService {
  constructor(
    @InjectRepository(WhatsappFlow)
    private readonly flowRepo: Repository<WhatsappFlow>,
  ) {}

  async findAll(tenantId: string): Promise<WhatsappFlow[]> {
    return this.flowRepo.find({
      where: { tenant_id: tenantId },
      order: { priority: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<WhatsappFlow> {
    const flow = await this.flowRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async create(tenantId: string, dto: CreateFlowDto): Promise<WhatsappFlow> {
    const flow = this.flowRepo.create({ ...dto, tenant_id: tenantId });
    return this.flowRepo.save(flow);
  }

  async update(tenantId: string, id: string, dto: UpdateFlowDto): Promise<WhatsappFlow> {
    const flow = await this.findOne(tenantId, id);
    Object.assign(flow, dto);
    return this.flowRepo.save(flow);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const flow = await this.findOne(tenantId, id);
    await this.flowRepo.remove(flow);
  }

  async duplicate(tenantId: string, id: string): Promise<WhatsappFlow> {
    const source = await this.findOne(tenantId, id);
    const copy = this.flowRepo.create({
      tenant_id: tenantId,
      name: `${source.name} (copia)`,
      trigger_type: source.trigger_type,
      trigger_config: source.trigger_config,
      nodes: source.nodes,
      edges: source.edges,
      is_active: false,
      priority: source.priority,
    });
    return this.flowRepo.save(copy);
  }

  async findActiveByTrigger(tenantId: string, triggerType: FlowTriggerType): Promise<WhatsappFlow[]> {
    return this.flowRepo.find({
      where: { tenant_id: tenantId, trigger_type: triggerType, is_active: true },
      order: { priority: 'DESC' },
    });
  }

  async validate(flow: WhatsappFlow): Promise<string[]> {
    const errors: string[] = [];
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    const triggerNodes = nodes.filter((n: any) => n.type === 'trigger');
    if (triggerNodes.length !== 1) {
      errors.push('O fluxo precisa ter exatamente 1 no de trigger');
    }

    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
        errors.push(`No "${node.data?.label || node.id}" nao esta conectado`);
      }
    }

    const conditionNodes = nodes.filter((n: any) =>
      ['condition', 'check_hours', 'check_customer'].includes(n.type),
    );
    for (const cNode of conditionNodes) {
      const outEdges = edges.filter((e: any) => e.source === cNode.id);
      const hasTrue = outEdges.some((e: any) => e.sourceHandle === 'true');
      const hasFalse = outEdges.some((e: any) => e.sourceHandle === 'false');
      if (!hasTrue || !hasFalse) {
        errors.push(`No de condicao "${cNode.data?.label || cNode.id}" precisa das saidas Sim e Nao`);
      }
    }

    const waitNodes = nodes.filter((n: any) => n.type === 'wait_input');
    for (const wNode of waitNodes) {
      if (!wNode.data?.timeout_minutes) {
        errors.push(`No "Aguardar Resposta" precisa de timeout configurado`);
      }
    }

    return errors;
  }
}
```

**Step 3: Commit**

```bash
git add apps/api/src/modules/whatsapp/dto/ apps/api/src/modules/whatsapp/services/whatsapp-flow.service.ts
git commit -m "feat: add flow CRUD service with validation"
```

---

### Task 5: Create Flow Execution Engine

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/flow-engine.service.ts`

**Step 1: Create the engine**

This is the core service. It evaluates each node type and processes the graph.

```typescript
// apps/api/src/modules/whatsapp/services/flow-engine.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WhatsappFlow } from '../entities/whatsapp-flow.entity';
import { WhatsappFlowExecution } from '../entities/whatsapp-flow-execution.entity';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { EvolutionApiService } from './evolution-api.service';
import { FlowExecutionStatus, FlowTriggerType, WhatsappInstanceStatus } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Order } from '../../order/entities/order.entity';

const MAX_NODES_PER_EXECUTION = 50;

@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);

  constructor(
    @InjectRepository(WhatsappFlowExecution)
    private readonly executionRepo: Repository<WhatsappFlowExecution>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectQueue('flow-execution')
    private readonly flowQueue: Queue,
    private readonly templateService: WhatsappTemplateService,
    private readonly instanceService: WhatsappInstanceService,
    private readonly evolutionApi: EvolutionApiService,
  ) {}

  async startExecution(
    flow: WhatsappFlow,
    phone: string,
    initialContext: Record<string, any> = {},
  ): Promise<WhatsappFlowExecution> {
    const execution = this.executionRepo.create({
      flow_id: flow.id,
      tenant_id: flow.tenant_id,
      customer_phone: phone,
      status: FlowExecutionStatus.RUNNING,
      context: initialContext,
      started_at: new Date(),
    });
    await this.executionRepo.save(execution);

    const triggerNode = (flow.nodes || []).find((n: any) => n.type === 'trigger');
    if (!triggerNode) {
      execution.status = FlowExecutionStatus.FAILED;
      await this.executionRepo.save(execution);
      return execution;
    }

    await this.flowQueue.add('process-node', {
      executionId: execution.id,
      flowId: flow.id,
      nodeId: triggerNode.id,
      nodesProcessed: 0,
    });

    return execution;
  }

  async processNode(
    executionId: string,
    flowId: string,
    nodeId: string,
    nodesProcessed: number,
  ): Promise<void> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution || execution.status === FlowExecutionStatus.CANCELLED || execution.status === FlowExecutionStatus.COMPLETED) {
      return;
    }

    if (nodesProcessed >= MAX_NODES_PER_EXECUTION) {
      this.logger.warn(`Execution ${executionId} hit max nodes limit`);
      execution.status = FlowExecutionStatus.FAILED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
      return;
    }

    const flow = await this.executionRepo.manager
      .getRepository(WhatsappFlow)
      .findOne({ where: { id: flowId } });
    if (!flow) return;

    const node = (flow.nodes || []).find((n: any) => n.id === nodeId);
    if (!node) {
      execution.status = FlowExecutionStatus.COMPLETED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
      return;
    }

    const instance = await this.instanceService.getInstanceByTenantId(execution.tenant_id);
    if (!instance || instance.status !== WhatsappInstanceStatus.CONNECTED) {
      execution.status = FlowExecutionStatus.FAILED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
      return;
    }

    let nextHandle: string | null = null; // for condition nodes: 'true' or 'false'

    try {
      switch (node.type) {
        case 'trigger':
          // Trigger node just passes through to next
          break;

        case 'send_message': {
          const tenant = await this.tenantRepo.findOne({ where: { id: execution.tenant_id } });
          const storefrontUrl = `https://menufacil.maistechtecnologia.com.br/${tenant?.slug || ''}`;
          const tenantVars = tenant ? this.templateService.buildTenantVariables(tenant, storefrontUrl) : {};
          const allVars = { ...tenantVars, ...execution.context, customer_name: execution.context.customer_name || 'Cliente' };
          const text = this.templateService.renderTemplate(node.data.content || '', allVars);
          await this.evolutionApi.sendTextMessage(instance.instance_name, execution.customer_phone, text);
          break;
        }

        case 'send_media': {
          const caption = node.data.caption || '';
          await this.evolutionApi.sendTextMessage(instance.instance_name, execution.customer_phone, `${caption}\n${node.data.media_url || ''}`);
          break;
        }

        case 'send_menu_link': {
          const tenant = await this.tenantRepo.findOne({ where: { id: execution.tenant_id } });
          const url = `https://menufacil.maistechtecnologia.com.br/${tenant?.slug || ''}`;
          await this.evolutionApi.sendTextMessage(instance.instance_name, execution.customer_phone, `📋 Acesse nosso cardapio: ${url}`);
          break;
        }

        case 'delay': {
          const delayMinutes = node.data.minutes || 1;
          execution.current_node_id = nodeId;
          await this.executionRepo.save(execution);

          const nextNodeId = this.getNextNodeId(flow, nodeId);
          if (nextNodeId) {
            await this.flowQueue.add('process-node', {
              executionId, flowId, nodeId: nextNodeId, nodesProcessed: nodesProcessed + 1,
            }, { delay: delayMinutes * 60 * 1000 });
          }
          return; // stop processing, Bull will resume
        }

        case 'wait_input': {
          execution.status = FlowExecutionStatus.WAITING_INPUT;
          execution.current_node_id = nodeId;
          await this.executionRepo.save(execution);

          // Schedule timeout
          const timeoutMinutes = node.data.timeout_minutes || 5;
          await this.flowQueue.add('wait-timeout', {
            executionId, flowId, nodeId, nodesProcessed: nodesProcessed + 1,
          }, { delay: timeoutMinutes * 60 * 1000, jobId: `wait-timeout-${executionId}` });
          return; // stop processing, incoming message or timeout will resume
        }

        case 'condition': {
          nextHandle = this.evaluateCondition(node.data, execution.context) ? 'true' : 'false';
          break;
        }

        case 'check_hours': {
          const tenant = await this.tenantRepo.findOne({ where: { id: execution.tenant_id } });
          const isOpen = this.checkStoreOpen(tenant);
          nextHandle = isOpen ? 'true' : 'false';
          break;
        }

        case 'check_customer': {
          const result = await this.evaluateCustomerCheck(node.data, execution);
          nextHandle = result ? 'true' : 'false';
          break;
        }

        case 'lookup_order': {
          const lastOrder = await this.orderRepo.findOne({
            where: { tenant_id: execution.tenant_id },
            order: { created_at: 'DESC' },
            relations: ['items'],
          });
          if (lastOrder) {
            execution.context = {
              ...execution.context,
              'last_order.order_number': String(lastOrder.order_number),
              'last_order.total': Number(lastOrder.total).toFixed(2),
              'last_order.status': lastOrder.status,
              'last_order.items': lastOrder.items?.map((i) => `${i.quantity}x ${i.product_name}`).join(', ') || '',
            };
            await this.executionRepo.save(execution);
          }
          break;
        }

        case 'transfer_human': {
          execution.status = FlowExecutionStatus.CANCELLED;
          execution.completed_at = new Date();
          execution.context = { ...execution.context, transferred_to_human: true };
          await this.executionRepo.save(execution);
          return;
        }

        default:
          this.logger.warn(`Unknown node type: ${node.type}`);
      }
    } catch (err: any) {
      this.logger.error(`Error processing node ${nodeId}: ${err.message}`, err.stack);
      // Continue to next node even on error
    }

    // Advance to next node
    const nextNodeId = nextHandle
      ? this.getNextNodeIdByHandle(flow, nodeId, nextHandle)
      : this.getNextNodeId(flow, nodeId);

    if (nextNodeId) {
      await this.flowQueue.add('process-node', {
        executionId, flowId, nodeId: nextNodeId, nodesProcessed: nodesProcessed + 1,
      });
    } else {
      execution.status = FlowExecutionStatus.COMPLETED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
    }
  }

  async handleWaitInputResponse(executionId: string, input: string): Promise<void> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution || execution.status !== FlowExecutionStatus.WAITING_INPUT) return;

    // Cancel timeout job
    const timeoutJob = await this.flowQueue.getJob(`wait-timeout-${executionId}`);
    if (timeoutJob) await timeoutJob.remove();

    execution.status = FlowExecutionStatus.RUNNING;
    execution.context = { ...execution.context, last_input: input };
    await this.executionRepo.save(execution);

    const flow = await this.executionRepo.manager
      .getRepository(WhatsappFlow)
      .findOne({ where: { id: execution.flow_id } });
    if (!flow) return;

    const nextNodeId = this.getNextNodeId(flow, execution.current_node_id!);
    if (nextNodeId) {
      await this.flowQueue.add('process-node', {
        executionId, flowId: flow.id, nodeId: nextNodeId, nodesProcessed: 0,
      });
    } else {
      execution.status = FlowExecutionStatus.COMPLETED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
    }
  }

  async handleWaitTimeout(executionId: string, flowId: string, nodeId: string, nodesProcessed: number): Promise<void> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution || execution.status !== FlowExecutionStatus.WAITING_INPUT) return;

    const flow = await this.executionRepo.manager
      .getRepository(WhatsappFlow)
      .findOne({ where: { id: flowId } });
    if (!flow) return;

    const node = (flow.nodes || []).find((n: any) => n.id === nodeId);
    const timeoutNodeId = node?.data?.timeout_node_id;

    execution.status = FlowExecutionStatus.RUNNING;
    execution.context = { ...execution.context, last_input: '', input_timed_out: true };
    await this.executionRepo.save(execution);

    const nextNodeId = timeoutNodeId || this.getNextNodeId(flow, nodeId);
    if (nextNodeId) {
      await this.flowQueue.add('process-node', {
        executionId, flowId, nodeId: nextNodeId, nodesProcessed,
      });
    } else {
      execution.status = FlowExecutionStatus.COMPLETED;
      execution.completed_at = new Date();
      await this.executionRepo.save(execution);
    }
  }

  async getActiveExecution(tenantId: string, phone: string): Promise<WhatsappFlowExecution | null> {
    return this.executionRepo.findOne({
      where: [
        { tenant_id: tenantId, customer_phone: phone, status: FlowExecutionStatus.RUNNING },
        { tenant_id: tenantId, customer_phone: phone, status: FlowExecutionStatus.WAITING_INPUT },
      ],
      order: { created_at: 'DESC' },
    });
  }

  async cancelExecutionsByTenant(tenantId: string): Promise<void> {
    await this.executionRepo.update(
      { tenant_id: tenantId, status: FlowExecutionStatus.RUNNING },
      { status: FlowExecutionStatus.CANCELLED, completed_at: new Date() },
    );
    await this.executionRepo.update(
      { tenant_id: tenantId, status: FlowExecutionStatus.WAITING_INPUT },
      { status: FlowExecutionStatus.CANCELLED, completed_at: new Date() },
    );
  }

  private getNextNodeId(flow: WhatsappFlow, currentNodeId: string): string | null {
    const edge = (flow.edges || []).find((e: any) => e.source === currentNodeId && !e.sourceHandle);
    if (!edge) {
      // Also check edges without sourceHandle filter (default output)
      const anyEdge = (flow.edges || []).find((e: any) => e.source === currentNodeId);
      return anyEdge?.target || null;
    }
    return edge.target;
  }

  private getNextNodeIdByHandle(flow: WhatsappFlow, currentNodeId: string, handle: string): string | null {
    const edge = (flow.edges || []).find(
      (e: any) => e.source === currentNodeId && e.sourceHandle === handle,
    );
    return edge?.target || null;
  }

  private evaluateCondition(data: any, context: Record<string, any>): boolean {
    const { field, operator, value } = data;
    const actual = context[field] ?? '';

    switch (operator) {
      case 'eq': return String(actual) === String(value);
      case 'neq': return String(actual) !== String(value);
      case 'gt': return Number(actual) > Number(value);
      case 'lt': return Number(actual) < Number(value);
      case 'contains': return String(actual).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains': return !String(actual).toLowerCase().includes(String(value).toLowerCase());
      default: return false;
    }
  }

  private checkStoreOpen(tenant: Tenant | null): boolean {
    if (!tenant?.business_hours) return false;
    const now = new Date();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayKeys[now.getDay()];
    const hours = tenant.business_hours[dayKey];
    if (!hours?.open || !hours.openTime || !hours.closeTime) return false;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = hours.openTime.split(':').map(Number);
    const [ch, cm] = hours.closeTime.split(':').map(Number);
    return currentMinutes >= oh * 60 + om && currentMinutes < ch * 60 + cm;
  }

  private async evaluateCustomerCheck(data: any, execution: WhatsappFlowExecution): Promise<boolean> {
    const phone = execution.customer_phone;
    const tenantId = execution.tenant_id;

    switch (data.check_type) {
      case 'is_registered': {
        const customer = await this.customerRepo.findOne({ where: { tenant_id: tenantId, phone } });
        return !!customer;
      }
      case 'has_recent_order': {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const count = await this.orderRepo
          .createQueryBuilder('o')
          .innerJoin('o.customer', 'c')
          .where('o.tenant_id = :tenantId', { tenantId })
          .andWhere('c.phone = :phone', { phone })
          .andWhere('o.created_at > :since', { since: sevenDaysAgo })
          .getCount();
        return count > 0;
      }
      case 'loyalty_points_gt': {
        const customer = await this.customerRepo.findOne({ where: { tenant_id: tenantId, phone } });
        return (customer?.loyalty_points || 0) > Number(data.value || 0);
      }
      default:
        return false;
    }
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/flow-engine.service.ts
git commit -m "feat: add flow execution engine with Bull queue"
```

---

### Task 6: Create Bull Queue Processor

**Files:**
- Create: `apps/api/src/modules/whatsapp/processors/flow-execution.processor.ts`

**Step 1: Create the processor**

```typescript
// apps/api/src/modules/whatsapp/processors/flow-execution.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { FlowEngineService } from '../services/flow-engine.service';

@Processor('flow-execution')
export class FlowExecutionProcessor {
  private readonly logger = new Logger(FlowExecutionProcessor.name);

  constructor(private readonly flowEngine: FlowEngineService) {}

  @Process('process-node')
  async handleProcessNode(job: Job) {
    const { executionId, flowId, nodeId, nodesProcessed } = job.data;
    this.logger.debug(`Processing node ${nodeId} for execution ${executionId}`);
    await this.flowEngine.processNode(executionId, flowId, nodeId, nodesProcessed);
  }

  @Process('wait-timeout')
  async handleWaitTimeout(job: Job) {
    const { executionId, flowId, nodeId, nodesProcessed } = job.data;
    this.logger.debug(`Wait timeout for execution ${executionId}`);
    await this.flowEngine.handleWaitTimeout(executionId, flowId, nodeId, nodesProcessed);
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/processors/
git commit -m "feat: add Bull queue processor for flow execution"
```

---

### Task 7: Create Scheduled Flow Processor

**Files:**
- Create: `apps/api/src/modules/whatsapp/processors/flow-scheduled.processor.ts`
- Create: `apps/api/src/modules/whatsapp/services/flow-scheduler.service.ts`

**Step 1: Create scheduler service**

```typescript
// apps/api/src/modules/whatsapp/services/flow-scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WhatsappFlow } from '../entities/whatsapp-flow.entity';
import { FlowTriggerType } from '@menufacil/shared';

@Injectable()
export class FlowSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FlowSchedulerService.name);

  constructor(
    @InjectRepository(WhatsappFlow)
    private readonly flowRepo: Repository<WhatsappFlow>,
    @InjectQueue('flow-scheduled')
    private readonly scheduledQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.syncScheduledFlows();
  }

  async syncScheduledFlows(): Promise<void> {
    // Remove all existing repeatable jobs
    const existing = await this.scheduledQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.scheduledQueue.removeRepeatableByKey(job.key);
    }

    // Add repeatable jobs for all active scheduled flows
    const flows = await this.flowRepo.find({
      where: { trigger_type: FlowTriggerType.SCHEDULED, is_active: true },
    });

    for (const flow of flows) {
      const cron = flow.trigger_config?.cron;
      if (!cron) continue;

      await this.scheduledQueue.add('execute-scheduled', {
        flowId: flow.id,
        tenantId: flow.tenant_id,
      }, { repeat: { cron }, jobId: `scheduled-${flow.id}` });

      this.logger.log(`Scheduled flow "${flow.name}" with cron: ${cron}`);
    }
  }
}
```

**Step 2: Create scheduled processor**

```typescript
// apps/api/src/modules/whatsapp/processors/flow-scheduled.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappFlow } from '../entities/whatsapp-flow.entity';
import { FlowEngineService } from '../services/flow-engine.service';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import { WhatsappMessageDirection } from '@menufacil/shared';

@Processor('flow-scheduled')
export class FlowScheduledProcessor {
  private readonly logger = new Logger(FlowScheduledProcessor.name);

  constructor(
    @InjectRepository(WhatsappFlow)
    private readonly flowRepo: Repository<WhatsappFlow>,
    @InjectRepository(WhatsappMessage)
    private readonly messageRepo: Repository<WhatsappMessage>,
    private readonly flowEngine: FlowEngineService,
  ) {}

  @Process('execute-scheduled')
  async handleScheduledFlow(job: Job) {
    const { flowId, tenantId } = job.data;

    const flow = await this.flowRepo.findOne({ where: { id: flowId, is_active: true } });
    if (!flow) return;

    // Get unique phones that have interacted with this tenant
    const phones = await this.messageRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.customer_phone', 'phone')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.direction = :direction', { direction: WhatsappMessageDirection.INBOUND })
      .getRawMany();

    this.logger.log(`Scheduled flow "${flow.name}": sending to ${phones.length} contacts`);

    for (const { phone } of phones) {
      try {
        await this.flowEngine.startExecution(flow, phone);
      } catch (err: any) {
        this.logger.error(`Failed scheduled execution for ${phone}: ${err.message}`);
      }
    }
  }
}
```

**Step 3: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/flow-scheduler.service.ts apps/api/src/modules/whatsapp/processors/flow-scheduled.processor.ts
git commit -m "feat: add scheduled flow processor with cron support"
```

---

### Task 8: Update WhatsApp Module and Controller

**Files:**
- Modify: `apps/api/src/modules/whatsapp/whatsapp.module.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp.controller.ts`
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-message.service.ts`

**Step 1: Update module to register Bull queues and new services**

Replace the entire `whatsapp.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WhatsappInstance } from './entities/whatsapp-instance.entity';
import { WhatsappMessageTemplate } from './entities/whatsapp-message-template.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { WhatsappFlow } from './entities/whatsapp-flow.entity';
import { WhatsappFlowExecution } from './entities/whatsapp-flow-execution.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Customer } from '../customer/entities/customer.entity';
import { Order } from '../order/entities/order.entity';
import { EvolutionApiService } from './services/evolution-api.service';
import { WhatsappInstanceService } from './services/whatsapp-instance.service';
import { WhatsappTemplateService } from './services/whatsapp-template.service';
import { WhatsappMessageService } from './services/whatsapp-message.service';
import { WhatsappFlowService } from './services/whatsapp-flow.service';
import { FlowEngineService } from './services/flow-engine.service';
import { FlowSchedulerService } from './services/flow-scheduler.service';
import { FlowExecutionProcessor } from './processors/flow-execution.processor';
import { FlowScheduledProcessor } from './processors/flow-scheduled.processor';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappInstance,
      WhatsappMessageTemplate,
      WhatsappMessage,
      WhatsappFlow,
      WhatsappFlowExecution,
      Tenant,
      Customer,
      Order,
    ]),
    BullModule.registerQueue(
      { name: 'flow-execution' },
      { name: 'flow-scheduled' },
    ),
  ],
  controllers: [WhatsappController],
  providers: [
    EvolutionApiService,
    WhatsappInstanceService,
    WhatsappTemplateService,
    WhatsappMessageService,
    WhatsappFlowService,
    FlowEngineService,
    FlowSchedulerService,
    FlowExecutionProcessor,
    FlowScheduledProcessor,
  ],
  exports: [WhatsappMessageService, WhatsappInstanceService],
})
export class WhatsappModule {}
```

**Step 2: Register BullModule globally in app.module.ts**

Find `apps/api/src/app.module.ts` and add `BullModule.forRoot()` to imports:

```typescript
import { BullModule } from '@nestjs/bull';

// In imports array, add:
BullModule.forRoot({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
}),
```

**Step 3: Add flow CRUD endpoints to controller**

Add these methods to `whatsapp.controller.ts`:

```typescript
// Add imports at top:
import { WhatsappFlowService } from './services/whatsapp-flow.service';
import { FlowEngineService } from './services/flow-engine.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

// Add to constructor:
private readonly flowService: WhatsappFlowService,
private readonly flowEngine: FlowEngineService,

// Add endpoints after template endpoints:

// --- Flows (protected) ---

@Get('flows')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
getFlows(@CurrentTenant('id') tenantId: string) {
  return this.flowService.findAll(tenantId);
}

@Get('flows/:id')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
getFlow(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
  return this.flowService.findOne(tenantId, id);
}

@Post('flows')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
createFlow(@CurrentTenant('id') tenantId: string, @Body() dto: CreateFlowDto) {
  return this.flowService.create(tenantId, dto);
}

@Put('flows/:id')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
updateFlow(
  @CurrentTenant('id') tenantId: string,
  @Param('id') id: string,
  @Body() dto: UpdateFlowDto,
) {
  return this.flowService.update(tenantId, id, dto);
}

@Delete('flows/:id')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
async deleteFlow(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
  await this.flowService.delete(tenantId, id);
  return { success: true };
}

@Post('flows/:id/duplicate')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
duplicateFlow(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
  return this.flowService.duplicate(tenantId, id);
}

@Post('flows/:id/validate')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('whatsapp:manage')
async validateFlow(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
  const flow = await this.flowService.findOne(tenantId, id);
  const errors = await this.flowService.validate(flow);
  return { valid: errors.length === 0, errors };
}
```

**Step 4: Update message service to check for active flows before auto-replying**

In `whatsapp-message.service.ts`, inject `FlowEngineService` and `WhatsappFlowService`, and modify `handleIncomingMessage`:

```typescript
// Add to constructor:
private readonly flowEngine: FlowEngineService,
private readonly flowService: WhatsappFlowService,

// Replace the auto-reply logic in handleIncomingMessage (after saving the inbound message):

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
```

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/ apps/api/src/app.module.ts
git commit -m "feat: wire up flow builder backend with Bull queues and controller endpoints"
```

---

### Task 9: Add Flow RTK Query Endpoints (Frontend)

**Files:**
- Modify: `apps/web/src/api/adminApi.ts`
- Modify: `apps/web/src/api/baseApi.ts`

**Step 1: Add tag type to baseApi.ts**

Add `'WhatsappFlows'` to the `tagTypes` array.

**Step 2: Add flow endpoints to adminApi.ts**

```typescript
// WhatsApp Flows
getWhatsappFlows: builder.query<any[], void>({
  query: () => ({ url: '/whatsapp/flows', method: 'GET', meta: { authContext: 'admin' as const } }),
  providesTags: ['WhatsappFlows'],
}),
getWhatsappFlow: builder.query<any, string>({
  query: (id) => ({ url: `/whatsapp/flows/${id}`, method: 'GET', meta: { authContext: 'admin' as const } }),
  providesTags: (_r, _e, id) => [{ type: 'WhatsappFlows', id }],
}),
createWhatsappFlow: builder.mutation<any, any>({
  query: (data) => ({ url: '/whatsapp/flows', method: 'POST', data, meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappFlows'],
}),
updateWhatsappFlow: builder.mutation<any, { id: string; data: any }>({
  query: ({ id, data }) => ({ url: `/whatsapp/flows/${id}`, method: 'PUT', data, meta: { authContext: 'admin' as const } }),
  invalidatesTags: (_r, _e, { id }) => ['WhatsappFlows', { type: 'WhatsappFlows', id }],
}),
deleteWhatsappFlow: builder.mutation<any, string>({
  query: (id) => ({ url: `/whatsapp/flows/${id}`, method: 'DELETE', meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappFlows'],
}),
duplicateWhatsappFlow: builder.mutation<any, string>({
  query: (id) => ({ url: `/whatsapp/flows/${id}/duplicate`, method: 'POST', meta: { authContext: 'admin' as const } }),
  invalidatesTags: ['WhatsappFlows'],
}),
validateWhatsappFlow: builder.mutation<{ valid: boolean; errors: string[] }, string>({
  query: (id) => ({ url: `/whatsapp/flows/${id}/validate`, method: 'POST', meta: { authContext: 'admin' as const } }),
}),
```

Export the hooks at the bottom.

**Step 3: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat: add flow builder RTK Query endpoints"
```

---

### Task 10: Create Flow List Page

**Files:**
- Modify: `apps/web/src/pages/admin/whatsapp/WhatsappPage.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/FlowsTab.tsx`

**Step 1: Add Fluxos tab to WhatsappPage**

```typescript
const TABS = [
  { key: 'conversas', label: 'Conversas' },
  { key: 'templates', label: 'Templates' },
  { key: 'fluxos', label: 'Fluxos' },
];

// In the render:
{activeTab === 'fluxos' && <FlowsTab />}
```

**Step 2: Create FlowsTab component**

Build a list with: flow name, trigger type badge, active toggle, priority, actions (edit, duplicate, delete). "Novo Fluxo" button creates a blank flow and navigates to the editor.

Use existing UI components: `Card`, `Badge`, `Button`, `Toggle`, `EmptyState`, `Spinner`.

Trigger type badges:
- `message_received` → info, "Mensagem"
- `order_status_changed` → success, "Status Pedido"
- `scheduled` → warning, "Agendado"
- `new_customer` → default, "Novo Cliente"

**Step 3: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/
git commit -m "feat: add flows list tab to WhatsApp page"
```

---

### Task 11: Create React Flow Editor — Base Setup

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/FlowEditor.tsx`
- Modify: `apps/web/src/App.tsx` (add route)

**Step 1: Add route to App.tsx**

```typescript
const FlowEditor = lazy(() => import('@/pages/admin/whatsapp/FlowEditor'));

// Inside admin routes:
<Route path="whatsapp/flows/:id" element={<FlowEditor />} />
```

**Step 2: Create FlowEditor base component**

Full-screen React Flow editor with:
- Top toolbar: back button, flow name (editable input), save button, active toggle
- ReactFlow canvas in the center
- Node palette panel (left) — collapsible
- Node config panel (right) — opens when a node is selected

Use `@xyflow/react` imports:
```typescript
import { ReactFlow, Background, Controls, Panel, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

Load flow data via `useGetWhatsappFlowQuery(id)`, save via `useUpdateWhatsappFlowMutation()`.

**Step 3: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/FlowEditor.tsx apps/web/src/App.tsx
git commit -m "feat: add React Flow editor base with toolbar and routing"
```

---

### Task 12: Create Custom Node Components

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/TriggerNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/SendMessageNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/SendMediaNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/SendMenuLinkNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/DelayNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/WaitInputNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/ConditionNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/CheckHoursNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/CheckCustomerNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/LookupOrderNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/TransferHumanNode.tsx`
- Create: `apps/web/src/pages/admin/whatsapp/flow-nodes/index.ts`

**Step 1: Create each custom node**

Each node follows this pattern:
```typescript
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react'; // icon varies by node type

export function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl px-4 py-3 min-w-[180px] shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700 uppercase">Trigger</span>
      </div>
      <p className="text-sm text-gray-800 truncate">{data.label || 'Mensagem Recebida'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}
```

**Color scheme per category:**
- Trigger nodes: `blue-50`/`blue-300` border, `blue-600` icon
- Action nodes: `green-50`/`green-300` border, `green-600` icon
- Logic nodes: `amber-50`/`amber-300` border, `amber-600` icon
- Input nodes: `purple-50`/`purple-300` border, `purple-600` icon

**Condition-type nodes** get two output handles:
```typescript
<Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500" style={{ left: '30%' }} />
<Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500" style={{ left: '70%' }} />
```

**Step 2: Create index.ts barrel export**

```typescript
// apps/web/src/pages/admin/whatsapp/flow-nodes/index.ts
import { TriggerNode } from './TriggerNode';
import { SendMessageNode } from './SendMessageNode';
// ... all nodes

export const nodeTypes = {
  trigger: TriggerNode,
  send_message: SendMessageNode,
  send_media: SendMediaNode,
  send_menu_link: SendMenuLinkNode,
  delay: DelayNode,
  wait_input: WaitInputNode,
  condition: ConditionNode,
  check_hours: CheckHoursNode,
  check_customer: CheckCustomerNode,
  lookup_order: LookupOrderNode,
  transfer_human: TransferHumanNode,
};
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/flow-nodes/
git commit -m "feat: add custom React Flow node components for all node types"
```

---

### Task 13: Create Node Palette (Drag-to-Add)

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/flow-editor/NodePalette.tsx`

**Step 1: Create draggable palette**

Sidebar panel with node types grouped by category. Each item is draggable using React Flow's drag-and-drop pattern (`onDragStart` sets `application/reactflow` data).

Groups:
- Triggers (Zap icon): Mensagem Recebida, Status do Pedido, Agendado, Novo Cliente
- Acoes (Send icon): Enviar Mensagem, Enviar Midia, Enviar Cardapio, Delay, Transferir p/ Atendente
- Logica (GitBranch icon): Condicao, Verificar Horario, Verificar Cliente, Consultar Pedido
- Input (Clock icon): Aguardar Resposta

In FlowEditor, handle `onDrop` to create a new node at the drop position.

**Step 2: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/flow-editor/
git commit -m "feat: add draggable node palette for flow editor"
```

---

### Task 14: Create Node Configuration Panel

**Files:**
- Create: `apps/web/src/pages/admin/whatsapp/flow-editor/NodeConfigPanel.tsx`

**Step 1: Create config panel**

Right sidebar that shows when a node is selected. Renders different form fields based on node type:

- **trigger**: trigger_type select + config fields (keywords input for `message_received`, cron input for `scheduled`, order status multi-select for `order_status_changed`)
- **send_message**: textarea with variable buttons (reuse pattern from TemplateFormModal), preview
- **send_media**: URL input + caption textarea
- **delay**: number input (minutes)
- **wait_input**: timeout_minutes number input
- **condition**: field dropdown, operator dropdown, value input
- **check_customer**: check_type select (is_registered, has_recent_order, loyalty_points_gt), value input for loyalty_points_gt

Changes are applied directly to the node data via `setNodes` from React Flow.

**Step 2: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/flow-editor/NodeConfigPanel.tsx
git commit -m "feat: add node configuration panel for flow editor"
```

---

### Task 15: Wire Up Flow Editor — Save, Validate, Delete

**Files:**
- Modify: `apps/web/src/pages/admin/whatsapp/FlowEditor.tsx`

**Step 1: Integrate all pieces**

- Load flow from API on mount
- Pass `nodeTypes` to ReactFlow
- Handle drag-and-drop from palette
- Handle node selection → show config panel
- Save button: serialize nodes + edges, call `updateWhatsappFlow`
- Validate button: call `validateWhatsappFlow`, show errors as toast
- Auto-save with debounce (optional, nice to have)
- Keyboard shortcut: Ctrl+S to save, Delete/Backspace to remove selected node

**Step 2: Commit**

```bash
git add apps/web/src/pages/admin/whatsapp/FlowEditor.tsx
git commit -m "feat: wire up flow editor with save, validate, and node management"
```

---

### Task 16: Add Plan Module and Limits

**Files:**
- Modify: `apps/api/src/database/seeds/run-seed.ts` (add `whatsapp_flows` module)
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-flow.service.ts` (add limit validation)
- Modify: `apps/web/src/pages/admin/whatsapp/WhatsappPage.tsx` (check module access)
- Modify: `apps/web/src/components/layout/AdminLayout.tsx` (update sidebar if needed)

**Step 1: Add system module seed**

Add to the modules seed array:
```typescript
{ key: 'whatsapp_flows', name: 'Fluxos WhatsApp', description: 'Automacao de conversas WhatsApp' }
```

**Step 2: Add limit checks in flow service**

Before creating or activating a flow, check `plan.flow_limits` for max_flows, max_nodes_per_flow, allow_scheduled, allow_media.

**Step 3: Frontend module check**

In WhatsappPage, use `hasModule('whatsapp_flows')` to conditionally show the Fluxos tab.

**Step 4: Commit**

```bash
git add apps/api/src/database/seeds/ apps/api/src/modules/whatsapp/ apps/web/src/pages/admin/whatsapp/
git commit -m "feat: add whatsapp_flows plan module with limits"
```

---

### Task 17: Integrate Flow Triggers with Existing Webhook

**Files:**
- Modify: `apps/api/src/modules/whatsapp/whatsapp.controller.ts`
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-message.service.ts`

**Step 1: Add order status trigger**

In the order service (or via a new event listener), when order status changes, check for flows with `order_status_changed` trigger that match the new status. Start execution with order data in context.

**Step 2: Add new customer trigger**

In the customer service, after creating a new customer, check for flows with `new_customer` trigger and start execution.

**Step 3: Update handleIncomingMessage**

The message service already needs to check for flow executions before the welcome template fallback (done in Task 8 Step 4). Verify this integration works end-to-end.

**Step 4: Commit**

```bash
git add apps/api/src/modules/
git commit -m "feat: integrate flow triggers with order status and new customer events"
```

---

### Task 18: Cancel Executions on WhatsApp Disconnect

**Files:**
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts`

**Step 1: Cancel active executions on disconnect**

In the `disconnect` method and in `handleConnectionUpdate` when state is `close`, call `flowEngine.cancelExecutionsByTenant(tenantId)`.

**Step 2: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/whatsapp-instance.service.ts
git commit -m "feat: cancel flow executions on WhatsApp disconnect"
```

---

### Task 19: Final Integration Testing and Polish

**Step 1: Type check both projects**

```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

**Step 2: Test the complete flow**

1. Create a flow via the editor
2. Add trigger → condition → send_message nodes
3. Save and activate
4. Send a WhatsApp message and verify the flow executes
5. Test delay and wait_input nodes
6. Test validation errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: WhatsApp flow builder - final integration and polish"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Install deps | — |
| 2 | Shared enums | — |
| 3 | Backend entities | 2 |
| 4 | Flow CRUD service | 3 |
| 5 | Flow engine | 3, 4 |
| 6 | Bull processor | 5 |
| 7 | Scheduled processor | 5, 6 |
| 8 | Module + Controller wiring | 4, 5, 6, 7 |
| 9 | RTK Query endpoints | — |
| 10 | Flows list tab | 9 |
| 11 | Flow editor base | 9 |
| 12 | Custom node components | — |
| 13 | Node palette | 12 |
| 14 | Node config panel | 12 |
| 15 | Editor wiring | 11, 12, 13, 14 |
| 16 | Plan module + limits | 4 |
| 17 | Trigger integration | 5, 8 |
| 18 | Disconnect cleanup | 5 |
| 19 | Testing + polish | all |

**Parallelizable:** Tasks 1-2 (setup), Tasks 9-14 (frontend, independent of backend), Tasks 3-8 (backend chain).
