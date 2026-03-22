import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from './referral.entity';
import { Customer } from '../customer/entities/customer.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';

const DEFAULT_REFERRAL_POINTS = 100;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async getMyCode(customerId: string, tenantId: string): Promise<{ code: string }> {
    // Check if customer already has a referral code
    let referral = await this.referralRepo.findOne({
      where: { referrer_id: customerId, tenant_id: tenantId, referred_id: undefined as any },
    });

    // Find any referral created by this customer (the "template" referral)
    const existing = await this.referralRepo
      .createQueryBuilder('r')
      .where('r.referrer_id = :customerId', { customerId })
      .andWhere('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.referred_id IS NULL')
      .getOne();

    if (existing) {
      return { code: existing.code };
    }

    // Generate new code
    const code = this.generateCode();
    const newReferral = this.referralRepo.create({
      referrer_id: customerId,
      tenant_id: tenantId,
      code,
    });
    await this.referralRepo.save(newReferral);
    return { code };
  }

  async getMyReferrals(customerId: string, tenantId: string): Promise<any[]> {
    const referrals = await this.referralRepo.find({
      where: { referrer_id: customerId, tenant_id: tenantId },
      relations: ['referred'],
      order: { created_at: 'DESC' },
    });

    return referrals
      .filter((r) => r.referred_id !== null)
      .map((r) => ({
        id: r.id,
        referred_name: r.referred?.name || 'Pendente',
        referred_phone: r.referred?.phone,
        reward_given: r.reward_given,
        points_awarded: r.points_awarded,
        created_at: r.created_at,
      }));
  }

  async applyReferral(referredCustomerId: string, code: string, tenantId: string): Promise<void> {
    // Find the template referral with this code
    const templateReferral = await this.referralRepo.findOne({
      where: { code, tenant_id: tenantId },
    });

    if (!templateReferral) {
      throw new NotFoundException('Código de indicação não encontrado');
    }

    if (templateReferral.referrer_id === referredCustomerId) {
      throw new BadRequestException('Você não pode usar seu próprio código de indicação');
    }

    // Check if this customer was already referred
    const alreadyReferred = await this.referralRepo.findOne({
      where: { referred_id: referredCustomerId, tenant_id: tenantId },
    });

    if (alreadyReferred) {
      throw new BadRequestException('Voce ja foi indicado por alguem');
    }

    // Create a new referral record linking the referred customer
    const newReferral = this.referralRepo.create({
      referrer_id: templateReferral.referrer_id,
      referred_id: referredCustomerId,
      code: this.generateCode(), // unique code for this specific referral
      tenant_id: tenantId,
    });
    await this.referralRepo.save(newReferral);
  }

  async awardReferralPoints(referredCustomerId: string, tenantId: string): Promise<void> {
    // Find the referral record for this referred customer
    const referral = await this.referralRepo.findOne({
      where: { referred_id: referredCustomerId, tenant_id: tenantId, reward_given: false },
    });

    if (!referral) return; // No referral to award

    const points = DEFAULT_REFERRAL_POINTS;

    // Award points to the referrer
    await this.loyaltyService.addPoints(referral.referrer_id, points, tenantId);

    // Mark referral as rewarded
    referral.reward_given = true;
    referral.points_awarded = points;
    await this.referralRepo.save(referral);

    this.logger.log(`Awarded ${points} referral points to customer ${referral.referrer_id}`);
  }

  async getReferralStats(tenantId: string): Promise<{
    total_referrals: number;
    successful_referrals: number;
    conversion_rate: number;
    total_points_awarded: number;
    top_referrers: any[];
  }> {
    const total = await this.referralRepo.count({
      where: { tenant_id: tenantId },
    });

    // Only count referrals where referred_id is set (actual referrals, not template codes)
    const allReferrals = await this.referralRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.referred_id IS NOT NULL')
      .getMany();

    const totalReferrals = allReferrals.length;
    const successful = allReferrals.filter((r) => r.reward_given).length;
    const conversionRate = totalReferrals > 0 ? (successful / totalReferrals) * 100 : 0;
    const totalPointsAwarded = allReferrals.reduce((sum, r) => sum + r.points_awarded, 0);

    // Top referrers
    const topReferrers = await this.referralRepo
      .createQueryBuilder('r')
      .select('r.referrer_id', 'referrer_id')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(r.points_awarded)', 'total_points')
      .leftJoin('r.referrer', 'customer')
      .addSelect('customer.name', 'name')
      .addSelect('customer.phone', 'phone')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.referred_id IS NOT NULL')
      .groupBy('r.referrer_id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.phone')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total_referrals: totalReferrals,
      successful_referrals: successful,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      total_points_awarded: totalPointsAwarded,
      top_referrers: topReferrers,
    };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
