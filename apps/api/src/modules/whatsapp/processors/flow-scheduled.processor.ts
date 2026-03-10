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
