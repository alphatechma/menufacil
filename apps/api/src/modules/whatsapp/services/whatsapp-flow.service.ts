import { Injectable, NotFoundException } from '@nestjs/common';
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
      ['condition', 'check_hours', 'check_customer', 'check_payment_method'].includes(n.type),
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
