import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual } from 'typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateRewardDto } from './dto/create-reward.dto';
import { CreateTierDto } from './dto/create-tier.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly rewardRepo: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyRedemption)
    private readonly redemptionRepo: Repository<LoyaltyRedemption>,
    @InjectRepository(LoyaltyTier)
    private readonly tierRepo: Repository<LoyaltyTier>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  // ─── Tier Methods ──────────────────────────────────────────

  async getTiers(tenantId: string): Promise<LoyaltyTier[]> {
    return this.tierRepo.find({
      where: { tenant_id: tenantId },
      order: { min_points: 'ASC' },
    });
  }

  async createTier(tenantId: string, dto: CreateTierDto): Promise<LoyaltyTier> {
    const tier = this.tierRepo.create({ ...dto, tenant_id: tenantId });
    return this.tierRepo.save(tier);
  }

  async updateTier(tenantId: string, id: string, dto: Partial<CreateTierDto>): Promise<LoyaltyTier> {
    const tier = await this.tierRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!tier) throw new NotFoundException('Tier not found');
    Object.assign(tier, dto);
    return this.tierRepo.save(tier);
  }

  async deleteTier(tenantId: string, id: string): Promise<void> {
    const tier = await this.tierRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!tier) throw new NotFoundException('Tier not found');
    await this.tierRepo.delete(id);
  }

  async getCustomerTier(
    tenantId: string,
    customerId: string,
  ): Promise<{ tier: LoyaltyTier | null; nextTier: LoyaltyTier | null; points: number }> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente nao encontrado');

    const tiers = await this.getTiers(tenantId);
    if (tiers.length === 0) {
      return { tier: null, nextTier: null, points: customer.loyalty_points };
    }

    // Find the tier where min_points <= customer.loyalty_points with highest min_points
    let currentTier: LoyaltyTier | null = null;
    let nextTier: LoyaltyTier | null = null;

    for (const t of tiers) {
      if (t.min_points <= customer.loyalty_points) {
        currentTier = t;
      } else {
        if (!nextTier) {
          nextTier = t;
        }
        break;
      }
    }

    return { tier: currentTier, nextTier, points: customer.loyalty_points };
  }

  async seedDefaultTiers(tenantId: string): Promise<LoyaltyTier[]> {
    const existing = await this.tierRepo.count({ where: { tenant_id: tenantId } });
    if (existing > 0) {
      throw new BadRequestException('Tiers ja existem para este tenant');
    }

    const defaults = [
      { name: 'Bronze', min_points: 0, multiplier: 1.0, benefits: ['Acumule pontos a cada pedido'], icon: 'medal', color: '#CD7F32', sort_order: 0 },
      { name: 'Prata', min_points: 500, multiplier: 1.5, benefits: ['1.5x pontos por pedido', 'Acesso antecipado a promocoes'], icon: 'award', color: '#C0C0C0', sort_order: 1 },
      { name: 'Ouro', min_points: 2000, multiplier: 2.0, benefits: ['2x pontos por pedido', 'Frete gratis', 'Descontos exclusivos'], icon: 'crown', color: '#FFD700', sort_order: 2 },
    ];

    const tiers = defaults.map((d) => this.tierRepo.create({ ...d, tenant_id: tenantId }));
    return this.tierRepo.save(tiers);
  }

  // ─── Reward Methods ────────────────────────────────────────

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
    // Delete redemptions referencing this reward to avoid FK constraint violation
    await this.redemptionRepo.delete({ reward_id: id });
    await this.rewardRepo.delete(id);
  }

  async addPoints(customerId: string, points: number, tenantId?: string): Promise<void> {
    // If tenantId is provided, apply tier multiplier
    if (tenantId) {
      const tierInfo = await this.getCustomerTier(tenantId, customerId);
      if (tierInfo.tier && Number(tierInfo.tier.multiplier) > 1) {
        points = Math.floor(points * Number(tierInfo.tier.multiplier));
      }
    }
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
