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
    try {
      await this.syncScheduledFlows();
    } catch (err: any) {
      this.logger.warn(`Could not sync scheduled flows on startup: ${err.message}`);
    }
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
