import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisHost = config.get('REDIS_HOST', 'localhost');
        const redisPort = config.get('REDIS_PORT', 6379);
        const redisPassword = config.get('REDIS_PASSWORD', '');

        // Use in-memory cache if Redis is not configured
        if (!redisHost || redisHost === 'localhost') {
          return { ttl: 60000, max: 500 } as any;
        }

        return {
          store: require('cache-manager-ioredis-yet').redisStore,
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          ttl: 60000, // 60 seconds default
        } as any;
      },
    }),
  ],
  providers: [CacheInvalidationService],
  exports: [NestCacheModule, CacheInvalidationService],
})
export class CacheConfigModule {}
