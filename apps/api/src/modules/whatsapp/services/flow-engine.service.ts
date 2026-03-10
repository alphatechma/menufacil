import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WhatsappFlow } from '../entities/whatsapp-flow.entity';
import { WhatsappFlowExecution } from '../entities/whatsapp-flow-execution.entity';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { EvolutionApiService } from './evolution-api.service';
import { FlowExecutionStatus, WhatsappInstanceStatus } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Order } from '../../order/entities/order.entity';
import { normalizePhone } from '../../../common/utils/normalize-phone';

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
    @Inject(forwardRef(() => WhatsappInstanceService))
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
      customer_phone: normalizePhone(phone),
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

    let nextHandle: string | null = null;

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
    const normalized = normalizePhone(phone);
    return this.executionRepo.findOne({
      where: [
        { tenant_id: tenantId, customer_phone: normalized, status: FlowExecutionStatus.RUNNING },
        { tenant_id: tenantId, customer_phone: normalized, status: FlowExecutionStatus.WAITING_INPUT },
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
