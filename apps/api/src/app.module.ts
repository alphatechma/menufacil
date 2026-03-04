import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { getDatabaseConfig } from './config/database.config';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DeliveryZoneModule } from './modules/delivery-zone/delivery-zone.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '..', '.env'),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    TenantModule,
    AuthModule,
    UserModule,
    UploadModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    CustomerModule,
    DeliveryZoneModule,
    CouponModule,
    LoyaltyModule,
    WebsocketModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
