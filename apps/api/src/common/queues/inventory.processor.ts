import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InventoryService } from '../../modules/inventory/inventory.service';

export interface DeductStockPayload {
  orderId: string;
  tenantId: string;
}

@Processor('inventory')
export class InventoryProcessor {
  private readonly logger = new Logger(InventoryProcessor.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Process({ name: 'deduct-stock', concurrency: 5 })
  async handleDeductStock(job: Job<DeductStockPayload>): Promise<void> {
    const { orderId, tenantId } = job.data;
    this.logger.log(`Processing stock deduction for order ${orderId} (tenant: ${tenantId})`);

    try {
      await this.inventoryService.autoDeductStock(orderId, tenantId);
      this.logger.log(`Stock deducted successfully for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Stock deduction failed for order ${orderId}: ${(error as Error).message}`, (error as Error).stack);
      throw error; // Re-throw to trigger retry
    }
  }
}
