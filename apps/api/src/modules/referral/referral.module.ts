import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from './referral.entity';
import { Customer } from '../customer/entities/customer.entity';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, Customer]),
    LoyaltyModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
