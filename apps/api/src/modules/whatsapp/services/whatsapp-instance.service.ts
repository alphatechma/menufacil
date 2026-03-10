import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappInstance } from '../entities/whatsapp-instance.entity';
import { WhatsappInstanceStatus, WEBSOCKET_EVENTS, WEBSOCKET_ROOMS } from '@menufacil/shared';
import { EvolutionApiService } from './evolution-api.service';
import { FlowEngineService } from './flow-engine.service';
import { EventsGateway } from '../../../websocket/events.gateway';

@Injectable()
export class WhatsappInstanceService {
  private readonly logger = new Logger(WhatsappInstanceService.name);

  constructor(
    @InjectRepository(WhatsappInstance)
    private readonly instanceRepo: Repository<WhatsappInstance>,
    private readonly evolutionApi: EvolutionApiService,
    @Inject(forwardRef(() => FlowEngineService))
    private readonly flowEngine: FlowEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private generateSuffix(): string {
    return Math.random().toString(36).substring(2, 6);
  }

  async connect(tenantId: string, tenantSlug: string): Promise<{ qrcode?: string; pairingCode?: string; instance: WhatsappInstance }> {
    let instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });

    if (!instance) {
      const instanceName = `menufacil-${tenantSlug}-${this.generateSuffix()}`;
      await this.evolutionApi.createInstance(instanceName);
      instance = this.instanceRepo.create({
        tenant_id: tenantId,
        instance_name: instanceName,
        status: WhatsappInstanceStatus.CONNECTING,
      });
      await this.instanceRepo.save(instance);
    } else if (instance.status === WhatsappInstanceStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp already connected');
    } else {
      // Try to delete old instance from Evolution and create fresh one
      try {
        await this.evolutionApi.deleteInstance(instance.instance_name);
      } catch { /* may not exist */ }

      const instanceName = `menufacil-${tenantSlug}-${this.generateSuffix()}`;
      await this.evolutionApi.createInstance(instanceName);
      instance.instance_name = instanceName;
      instance.status = WhatsappInstanceStatus.CONNECTING;
      await this.instanceRepo.save(instance);
    }

    const connectResult = await this.evolutionApi.connectInstance(instance.instance_name);
    return { qrcode: connectResult.base64 || connectResult.code, pairingCode: connectResult.pairingCode, instance };
  }

  async disconnect(tenantId: string): Promise<void> {
    const instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });
    if (!instance) throw new BadRequestException('No WhatsApp instance found');

    try {
      await this.evolutionApi.logoutInstance(instance.instance_name);
    } catch (err: any) {
      this.logger.warn(`Error during logout (continuing with delete): ${err.message}`);
    }

    try {
      await this.evolutionApi.deleteInstance(instance.instance_name);
    } catch (err: any) {
      this.logger.warn(`Error deleting Evolution API instance: ${err.message}`);
    }

    instance.status = WhatsappInstanceStatus.DISCONNECTED;
    (instance as any).phone_number = null;
    await this.instanceRepo.save(instance);
    this.emitStatusUpdate(tenantId, instance);

    // Cancel any running flow executions for this tenant
    await this.flowEngine.cancelExecutionsByTenant(tenantId);
  }

  async getStatus(tenantId: string): Promise<{ status: WhatsappInstanceStatus; phone_number: string | null }> {
    const instance = await this.instanceRepo.findOne({ where: { tenant_id: tenantId } });
    if (!instance) return { status: WhatsappInstanceStatus.DISCONNECTED, phone_number: null };

    if (instance.status === WhatsappInstanceStatus.CONNECTING) {
      try {
        const state = await this.evolutionApi.getConnectionState(instance.instance_name);
        if (state.instance?.state === 'open') {
          instance.status = WhatsappInstanceStatus.CONNECTED;
          const instances = await this.evolutionApi.fetchInstance(instance.instance_name);
          if (instances?.[0]?.instance?.owner) {
            instance.phone_number = instances[0].instance.owner.replace('@s.whatsapp.net', '');
          }
          await this.instanceRepo.save(instance);
        }
      } catch { /* Evolution API might not have the instance yet */ }
    }

    return { status: instance.status, phone_number: instance.phone_number };
  }

  async handleConnectionUpdate(instanceName: string, state: string, phoneNumber?: string): Promise<void> {
    const instance = await this.instanceRepo.findOne({ where: { instance_name: instanceName } });
    if (!instance) return;

    if (state === 'open') {
      instance.status = WhatsappInstanceStatus.CONNECTED;
      if (phoneNumber) instance.phone_number = phoneNumber.replace('@s.whatsapp.net', '');
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

  async getStatusByTenantId(tenantId: string): Promise<{ status: WhatsappInstanceStatus; phone_number: string | null }> {
    return this.getStatus(tenantId);
  }

  private emitStatusUpdate(tenantId: string, instance: WhatsappInstance) {
    this.eventsGateway.server
      .to(WEBSOCKET_ROOMS.tenantWhatsapp(tenantId))
      .emit(WEBSOCKET_EVENTS.WHATSAPP_STATUS_UPDATE, { status: instance.status, phone_number: instance.phone_number });
  }
}
