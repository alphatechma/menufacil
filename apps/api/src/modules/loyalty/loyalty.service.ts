import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateRewardDto } from './dto/create-reward.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly rewardRepo: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyRedemption)
    private readonly redemptionRepo: Repository<LoyaltyRedemption>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async createReward(dto: CreateRewardDto, tenantId: string): Promise<LoyaltyReward> {
    const reward = this.rewardRepo.create({ ...dto, tenant_id: tenantId });
    return this.rewardRepo.save(reward);
  }

  async updateReward(id: string, tenantId: string, dto: Partial<CreateRewardDto> & {
    is_active?: boolean;
    max_redemptions_per_customer?: number;
    cooldown_hours?: number;
    expiration_hours?: number;
    description?: string;
  }): Promise<LoyaltyReward> {
    const reward = await this.rewardRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');
    Object.assign(reward, dto);
    return this.rewardRepo.save(reward);
  }

  async findRewards(tenantId: string): Promise<LoyaltyReward[]> {
    return this.rewardRepo.find({
      where: { tenant_id: tenantId },
      order: { points_required: 'ASC' },
    });
  }

  async findActiveRewards(tenantId: string): Promise<LoyaltyReward[]> {
    return this.rewardRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { points_required: 'ASC' },
    });
  }

  async removeReward(id: string, tenantId: string): Promise<void> {
    const reward = await this.rewardRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');
    await this.rewardRepo.delete(id);
  }

  async addPoints(customerId: string, points: number): Promise<void> {
    await this.customerRepo.increment({ id: customerId }, 'loyalty_points', points);
  }

  async redeemReward(
    customerId: string,
    rewardId: string,
    tenantId: string,
  ): Promise<{ success: boolean; reward: LoyaltyReward; redemption: LoyaltyRedemption }> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente nao encontrado');

    const reward = await this.rewardRepo.findOne({ where: { id: rewardId, tenant_id: tenantId } });
    if (!reward) throw new NotFoundException('Recompensa nao encontrada');

    if (!reward.is_active) {
      throw new BadRequestException('Esta recompensa nao esta mais disponivel');
    }

    if (customer.loyalty_points < reward.points_required) {
      throw new BadRequestException(
        `Pontos insuficientes. Voce tem ${customer.loyalty_points} pontos, precisa de ${reward.points_required}.`,
      );
    }

    // Check cooldown: cannot redeem the same reward within cooldown period
    if (reward.cooldown_hours > 0) {
      const cooldownDate = new Date();
      cooldownDate.setHours(cooldownDate.getHours() - reward.cooldown_hours);

      const recentRedemption = await this.redemptionRepo.findOne({
        where: {
          customer_id: customerId,
          reward_id: rewardId,
          created_at: MoreThan(cooldownDate),
        },
        order: { created_at: 'DESC' },
      });

      if (recentRedemption) {
        const nextAvailable = new Date(recentRedemption.created_at);
        nextAvailable.setHours(nextAvailable.getHours() + reward.cooldown_hours);
        const hoursLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / 3600000);
        throw new BadRequestException(
          `Voce ja resgatou esta recompensa recentemente. Tente novamente em ${hoursLeft}h.`,
        );
      }
    }

    // Check max redemptions per customer (0 = unlimited)
    if (reward.max_redemptions_per_customer > 0) {
      const totalRedemptions = await this.redemptionRepo.count({
        where: { customer_id: customerId, reward_id: rewardId },
      });

      if (totalRedemptions >= reward.max_redemptions_per_customer) {
        throw new BadRequestException(
          `Voce ja atingiu o limite de ${reward.max_redemptions_per_customer} resgates para esta recompensa.`,
        );
      }
    }

    // Check if customer has pending (unused) redemptions for this reward
    const pendingRedemption = await this.redemptionRepo.findOne({
      where: {
        customer_id: customerId,
        reward_id: rewardId,
        status: 'pending',
      },
    });

    if (pendingRedemption) {
      throw new BadRequestException(
        'Voce ja tem um resgate pendente para esta recompensa. Use o cupom antes de resgatar novamente.',
      );
    }

    // Deduct points
    await this.customerRepo.decrement({ id: customerId }, 'loyalty_points', reward.points_required);

    // Generate unique coupon code
    const couponCode = this.generateCouponCode();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + reward.expiration_hours);

    // Create redemption record
    const redemption = this.redemptionRepo.create({
      tenant_id: tenantId,
      customer_id: customerId,
      reward_id: rewardId,
      points_spent: reward.points_required,
      coupon_code: couponCode,
      status: 'pending',
      expires_at: expiresAt,
    });

    const savedRedemption = await this.redemptionRepo.save(redemption);

    return { success: true, reward, redemption: savedRedemption };
  }

  async getCustomerRedemptions(customerId: string, tenantId: string): Promise<LoyaltyRedemption[]> {
    // Expire old redemptions first
    await this.expireOldRedemptions(tenantId);

    return this.redemptionRepo.find({
      where: { customer_id: customerId, tenant_id: tenantId },
      relations: ['reward'],
      order: { created_at: 'DESC' },
    });
  }

  async getAllRedemptions(tenantId: string): Promise<LoyaltyRedemption[]> {
    await this.expireOldRedemptions(tenantId);

    return this.redemptionRepo.find({
      where: { tenant_id: tenantId },
      relations: ['reward', 'customer'],
      order: { created_at: 'DESC' },
    });
  }

  async validateRedemptionCoupon(
    couponCode: string,
    tenantId: string,
  ): Promise<{ valid: boolean; redemption?: LoyaltyRedemption }> {
    const redemption = await this.redemptionRepo.findOne({
      where: { coupon_code: couponCode, tenant_id: tenantId, status: 'pending' },
      relations: ['reward'],
    });

    if (!redemption) {
      return { valid: false };
    }

    if (redemption.expires_at && new Date() > new Date(redemption.expires_at)) {
      redemption.status = 'expired';
      await this.redemptionRepo.save(redemption);
      return { valid: false };
    }

    return { valid: true, redemption };
  }

  async markRedemptionUsed(couponCode: string, tenantId: string): Promise<void> {
    const redemption = await this.redemptionRepo.findOne({
      where: { coupon_code: couponCode, tenant_id: tenantId, status: 'pending' },
    });
    if (redemption) {
      redemption.status = 'used';
      redemption.used_at = new Date();
      await this.redemptionRepo.save(redemption);
    }
  }

  private async expireOldRedemptions(tenantId: string): Promise<void> {
    await this.redemptionRepo
      .createQueryBuilder()
      .update(LoyaltyRedemption)
      .set({ status: 'expired' })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('status = :status', { status: 'pending' })
      .andWhere('expires_at < NOW()')
      .execute();
  }

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FID-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
