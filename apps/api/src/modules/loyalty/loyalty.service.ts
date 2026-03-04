import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateRewardDto } from './dto/create-reward.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly rewardRepo: Repository<LoyaltyReward>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async createReward(dto: CreateRewardDto, tenantId: string): Promise<LoyaltyReward> {
    const reward = this.rewardRepo.create({ ...dto, tenant_id: tenantId });
    return this.rewardRepo.save(reward);
  }

  async findRewards(tenantId: string): Promise<LoyaltyReward[]> {
    return this.rewardRepo.find({
      where: { tenant_id: tenantId },
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

  async redeemReward(customerId: string, rewardId: string, tenantId: string): Promise<{ success: boolean; reward: LoyaltyReward }> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const reward = await this.rewardRepo.findOne({ where: { id: rewardId, tenant_id: tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');

    if (customer.loyalty_points < reward.points_required) {
      throw new BadRequestException('Not enough points');
    }

    await this.customerRepo.decrement({ id: customerId }, 'loyalty_points', reward.points_required);

    return { success: true, reward };
  }
}
