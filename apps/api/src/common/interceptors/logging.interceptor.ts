import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, ip } = req;
    const tenantSlug = req.headers['x-tenant-slug'] || '-';
    const userAgent = req.headers['user-agent'] || '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${originalUrl} ${res.statusCode} ${duration}ms [${tenantSlug}] ${ip}`,
          );
          // Log slow requests as warnings
          if (duration > 3000) {
            this.logger.warn(
              `SLOW REQUEST: ${method} ${originalUrl} took ${duration}ms`,
            );
          }
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${originalUrl} ${err.status || 500} ${duration}ms [${tenantSlug}] ${ip} - ${err.message}`,
          );
        },
      }),
    );
  }
}
