import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone } from '../../../common/utils/normalize-phone';

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080').replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.webhookUrl = this.configService.get<string>('EVOLUTION_WEBHOOK_URL', '');
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`${method} ${url}`);
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorBody = await res.text();
      this.logger.error(`Evolution API error: ${res.status} ${errorBody}`);
      throw new Error(`Evolution API error: ${res.status} - ${errorBody}`);
    }
    return res.json() as Promise<T>;
  }

  async createInstance(instanceName: string): Promise<any> {
    return this.request('POST', '/instance/create', {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: false,
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      webhook: {
        url: this.webhookUrl,
        byEvents: true,
        base64: false,
        events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'QRCODE_UPDATED'],
      },
    });
  }

  async connectInstance(instanceName: string): Promise<{ pairingCode?: string; code?: string; base64?: string }> {
    return this.request('GET', `/instance/connect/${instanceName}`);
  }

  async getConnectionState(instanceName: string): Promise<{ instance: { instanceName: string; state: string } }> {
    return this.request('GET', `/instance/connectionState/${instanceName}`);
  }

  async fetchInstance(instanceName: string): Promise<any[]> {
    return this.request('GET', `/instance/fetchInstances?instanceName=${instanceName}`);
  }

  async logoutInstance(instanceName: string): Promise<any> {
    return this.request('DELETE', `/instance/logout/${instanceName}`);
  }

  async deleteInstance(instanceName: string): Promise<any> {
    return this.request('DELETE', `/instance/delete/${instanceName}`);
  }

  async setWebhook(instanceName: string): Promise<any> {
    return this.request('POST', `/webhook/set/${instanceName}`, {
      enabled: true,
      url: this.webhookUrl,
      webhookByEvents: true,
      webhookBase64: false,
      events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'QRCODE_UPDATED'],
    });
  }

  async sendTextMessage(instanceName: string, phone: string, text: string): Promise<any> {
    return this.request('POST', `/message/sendText/${instanceName}`, {
      number: normalizePhone(phone),
      text,
      delay: 1000,
      linkPreview: true,
    });
  }

  async sendListMessage(
    instanceName: string,
    phone: string,
    title: string,
    description: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ title: string; description?: string; rowId: string }>;
    }>,
  ): Promise<any> {
    return this.request('POST', `/message/sendList/${instanceName}`, {
      number: normalizePhone(phone),
      title,
      description,
      buttonText,
      footerText: '',
      sections,
      delay: 1000,
    });
  }
}
