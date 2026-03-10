import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../common/decorators';
import { RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
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

  // --- Instance (protected) ---

  @Post('instance/connect')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  connect(
    @CurrentTenant('id') tenantId: string,
    @CurrentTenant('slug') tenantSlug: string,
  ) {
    return this.instanceService.connect(tenantId, tenantSlug);
  }

  @Post('instance/disconnect')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async disconnect(@CurrentTenant('id') tenantId: string) {
    await this.instanceService.disconnect(tenantId);
    return { success: true };
  }

  @Get('instance/status')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  getStatus(@CurrentTenant('id') tenantId: string) {
    return this.instanceService.getStatus(tenantId);
  }

  // --- Templates (protected) ---

  @Get('templates')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async getTemplates(@CurrentTenant('id') tenantId: string) {
    await this.templateService.seedDefaults(tenantId);
    return this.templateService.findAll(tenantId);
  }

  @Post('templates')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  createTemplate(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templateService.create(tenantId, dto);
  }

  @Put('templates/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  updateTemplate(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(tenantId, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:manage')
  async deleteTemplate(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.templateService.delete(tenantId, id);
    return { success: true };
  }

  // --- Conversations (protected) ---

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  getConversations(@CurrentTenant('id') tenantId: string) {
    return this.messageService.getConversations(tenantId);
  }

  @Get('conversations/:phone')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  getMessages(
    @CurrentTenant('id') tenantId: string,
    @Param('phone') phone: string,
  ) {
    return this.messageService.getMessages(tenantId, phone);
  }

  @Post('messages/send')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('whatsapp:chat')
  sendMessage(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendFreeMessage(tenantId, dto.phone, dto.content);
  }

  // --- Webhook (PUBLIC, no auth) ---

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    this.logger.log(
      `Webhook received: event=${body.event} instance=${body.instance} data=${JSON.stringify(body.data).substring(0, 500)}`,
    );

    const event = body.event;
    const instanceName = body.instance;
    if (!instanceName) {
      this.logger.warn('Webhook received without instance name');
      return { received: true };
    }

    try {
      if (event === 'connection.update') {
        const state = body.data?.state;
        const phoneNumber = body.data?.wid;
        this.logger.log(`Connection update: instance=${instanceName} state=${state} phone=${phoneNumber}`);
        await this.instanceService.handleConnectionUpdate(
          instanceName,
          state,
          phoneNumber,
        );
      }

      if (event === 'messages.upsert') {
        const message = body.data;
        if (message?.key?.fromMe) {
          this.logger.debug('Ignoring own message');
          return { received: true };
        }

        const remoteJid = message?.key?.remoteJid || '';
        const phone = remoteJid
          .replace('@s.whatsapp.net', '')
          .replace('@lid', '');
        const content =
          message?.message?.conversation ||
          message?.message?.extendedTextMessage?.text ||
          message?.message?.buttonsResponseMessage?.selectedDisplayText ||
          message?.message?.listResponseMessage?.title ||
          '';

        this.logger.log(
          `Incoming message: phone=${phone} content="${content.substring(0, 100)}" remoteJid=${remoteJid} messageType=${message?.messageType}`,
        );

        if (phone && content) {
          await this.messageService.handleIncomingMessage(
            instanceName,
            phone,
            content,
          );
        } else {
          this.logger.warn(
            `Message skipped: phone=${phone} contentEmpty=${!content} messageType=${message?.messageType}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`Webhook processing error: ${err.message}`, err.stack);
    }

    return { received: true };
  }

  @Post('webhook/:event')
  async handleWebhookByEvent(@Body() body: any) {
    return this.handleWebhook(body);
  }
}
