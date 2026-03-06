import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { Customer } from '../customer/entities/customer.entity';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyReward, LoyaltyRedemption, Customer])],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
