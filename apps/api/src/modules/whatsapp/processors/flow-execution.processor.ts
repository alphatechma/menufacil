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
