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
    TypeOrmModule.forFeature([
      WhatsappInstance,
      WhatsappMessageTemplate,
      WhatsappMessage,
    ]),
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
