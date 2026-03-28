import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WhatsappMessageService } from '../../modules/whatsapp/services/whatsapp-message.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../modules/order/entities/order.entity';

export interface WhatsappOrderStatusPayload {
  orderId: string;
  tenantId: string;
}

export interface PushNotificationPayload {
  customerId: string;
  tenantId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly whatsappMessageService: WhatsappMessageService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  @Process({ name: 'whatsapp-order-status', concurrency: 5 })
  async handleWhatsappOrderStatus(job: Job<WhatsappOrderStatusPayload>): Promise<void> {
    const { orderId, tenantId } = job.data;
    this.logger.log(`Processing WhatsApp notification for order ${orderId} (tenant: ${tenantId})`);

    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId, tenant_id: tenantId },
        relations: ['customer', 'tenant'],
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found, skipping WhatsApp notification`);
        return;
      }

      await this.whatsappMessageService.sendOrderNotification(order);
      this.logger.log(`WhatsApp notification sent for order ${orderId}`);
    } catch (error) {
      this.logger.error(`WhatsApp notification failed for order ${orderId}: ${(error as Error).message}`, (error as Error).stack);
      throw error; // Re-throw to trigger retry
    }
  }

  @Process({ name: 'push-notification', concurrency: 5 })
  async handlePushNotification(job: Job<PushNotificationPayload>): Promise<void> {
    const { customerId, title } = job.data;
    this.logger.log(`Processing push notification for customer ${customerId}: ${title}`);

    try {
      // Push notification service integration placeholder
      // When a push service is added, call it here
      this.logger.log(`Push notification processed for customer ${customerId}`);
    } catch (error) {
      this.logger.error(`Push notification failed for customer ${customerId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
