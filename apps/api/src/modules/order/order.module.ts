import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemExtra } from './entities/order-item-extra.entity';
import { CashRegister } from './entities/cash-register.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariation } from '../product/entities/product-variation.entity';
import { CustomerAddress } from '../customer/entities/customer-address.entity';
import { RestaurantTable } from '../table/entities/table.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { DeliveryZoneModule } from '../delivery-zone/delivery-zone.module';
import { CouponModule } from '../coupon/coupon.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ReferralModule } from '../referral/referral.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DeliveryPersonModule } from '../delivery-person/delivery-person.module';
import { QueueModule } from '../../common/queues/queue.module';
import { NotificationProcessor } from '../../common/queues/notification.processor';
import { InventoryProcessor } from '../../common/queues/inventory.processor';
import { LoyaltyProcessor } from '../../common/queues/loyalty.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderItemExtra, Product, ProductVariation, CustomerAddress, RestaurantTable, CashRegister, Tenant]),
    DeliveryZoneModule,
    CouponModule,
    LoyaltyModule,
    WhatsappModule,
    ReferralModule,
    InventoryModule,
    DeliveryPersonModule,
    QueueModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, NotificationProcessor, InventoryProcessor, LoyaltyProcessor],
  exports: [OrderService],
})
export class OrderModule {}
