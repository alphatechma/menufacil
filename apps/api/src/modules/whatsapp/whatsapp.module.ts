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
