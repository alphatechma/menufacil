import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { getDatabaseConfig } from './config/database.config';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { UnitMiddleware } from './common/middleware/unit.middleware';
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
import { PlanModule } from './modules/plan/plan.module';
import { SystemModuleModule } from './modules/system-module/system-module.module';
import { PermissionModule } from './modules/permission/permission.module';
import { SuperAdminDashboardModule } from './modules/super-admin-dashboard/super-admin-dashboard.module';
import { DeliveryPersonModule } from './modules/delivery-person/delivery-person.module';
import { RoleModule } from './modules/role/role.module';
import { TableModule } from './modules/table/table.module';
import { TableSessionModule } from './modules/table-session/table-session.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { FloorPlanModule } from './modules/floor-plan/floor-plan.module';
import { QzTrayModule } from './modules/qz-tray/qz-tray.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { UnitModule } from './modules/unit/unit.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReferralModule } from './modules/referral/referral.module';
import { ReviewModule } from './modules/review/review.module';
import { AbandonedCartModule } from './modules/abandoned-cart/abandoned-cart.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthController } from './common/controllers/health.controller';

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
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 100,   // 100 requests per minute per IP
    }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
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
    PlanModule,
    SystemModuleModule,
    PermissionModule,
    SuperAdminDashboardModule,
    DeliveryPersonModule,
    RoleModule,
    TableModule,
    TableSessionModule,
    ReservationModule,
    FloorPlanModule,
    QzTrayModule,
    WhatsappModule,
    UnitModule,
    InventoryModule,
    ReferralModule,
    ReviewModule,
    AbandonedCartModule,
    AnalyticsModule,
    PromotionModule,
    WalletModule,
    AuditLogModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
    consumer.apply(UnitMiddleware).forRoutes('*');
  }
}
