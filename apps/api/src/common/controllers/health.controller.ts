import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const dbOk = this.dataSource.isInitialized;
    let dbLatency = -1;

    if (dbOk) {
      const start = Date.now();
      try {
        await this.dataSource.query('SELECT 1');
        dbLatency = Date.now() - start;
      } catch {
        dbLatency = -1;
      }
    }

    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: {
        connected: dbOk,
        latency: dbLatency >= 0 ? `${dbLatency}ms` : 'error',
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
    };
  }
}
