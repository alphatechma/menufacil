import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

// In-memory metrics (simple, no external dependency)
const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  avgResponseTime: 0,
  slowRequests: 0,
  requestsByEndpoint: new Map<
    string,
    { count: number; totalTime: number; errors: number }
  >(),
  requestsByStatus: new Map<number, number>(),
  startTime: Date.now(),
};

export function getMetrics() {
  const uptime = Math.round((Date.now() - metrics.startTime) / 1000);
  const topEndpoints = [...metrics.requestsByEndpoint.entries()]
    .map(([path, data]) => ({
      path,
      count: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      errors: data.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const statusCodes: Record<string, number> = {};
  metrics.requestsByStatus.forEach((count, status) => {
    statusCodes[String(status)] = count;
  });

  return {
    uptime,
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    avgResponseTime: Math.round(metrics.avgResponseTime),
    slowRequests: metrics.slowRequests,
    requestsPerSecond:
      uptime > 0
        ? Math.round((metrics.totalRequests / uptime) * 100) / 100
        : 0,
    errorRate:
      metrics.totalRequests > 0
        ? Math.round(
            (metrics.totalErrors / metrics.totalRequests) * 10000,
          ) / 100
        : 0,
    topEndpoints,
    statusCodes,
  };
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    // Normalize path (remove UUIDs for grouping)
    const path = req.originalUrl
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .split('?')[0];

    metrics.totalRequests++;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = context.switchToHttp().getResponse().statusCode;
          this.trackRequest(path, duration, status, false);
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err.status || 500;
          metrics.totalErrors++;
          this.trackRequest(path, duration, status, true);
        },
      }),
    );
  }

  private trackRequest(
    path: string,
    duration: number,
    status: number,
    isError: boolean,
  ) {
    // Update avg response time (rolling average)
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + duration) /
      metrics.totalRequests;
    if (duration > 3000) metrics.slowRequests++;

    // Track by endpoint
    const existing = metrics.requestsByEndpoint.get(path) || {
      count: 0,
      totalTime: 0,
      errors: 0,
    };
    existing.count++;
    existing.totalTime += duration;
    if (isError) existing.errors++;
    metrics.requestsByEndpoint.set(path, existing);

    // Track by status code
    metrics.requestsByStatus.set(
      status,
      (metrics.requestsByStatus.get(status) || 0) + 1,
    );
  }
}
