import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LoyaltyService } from '../../modules/loyalty/loyalty.service';
import { ReferralService } from '../../modules/referral/referral.service';

export interface AddPointsPayload {
  customerId: string;
  points: number;
  tenantId: string;
}

export interface AwardReferralPayload {
  customerId: string;
  tenantId: string;
}

@Processor('loyalty')
export class LoyaltyProcessor {
  private readonly logger = new Logger(LoyaltyProcessor.name);

  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly referralService: ReferralService,
  ) {}

  @Process({ name: 'add-points', concurrency: 5 })
  async handleAddPoints(job: Job<AddPointsPayload>): Promise<void> {
    const { customerId, points, tenantId } = job.data;
    this.logger.log(`Processing ${points} loyalty points for customer ${customerId} (tenant: ${tenantId})`);

    try {
      await this.loyaltyService.addPoints(customerId, points, tenantId);
      this.logger.log(`Loyalty points added for customer ${customerId}`);
    } catch (error) {
      this.logger.error(`Loyalty points failed for customer ${customerId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Process({ name: 'award-referral', concurrency: 3 })
  async handleAwardReferral(job: Job<AwardReferralPayload>): Promise<void> {
    const { customerId, tenantId } = job.data;
    this.logger.log(`Processing referral award for customer ${customerId} (tenant: ${tenantId})`);

    try {
      await this.referralService.awardReferralPoints(customerId, tenantId);
      this.logger.log(`Referral award processed for customer ${customerId}`);
    } catch (error) {
      this.logger.error(`Referral award failed for customer ${customerId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
