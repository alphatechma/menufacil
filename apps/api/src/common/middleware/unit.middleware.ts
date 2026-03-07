import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class UnitMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const unitId = req.headers['x-unit-id'] as string;
    if (unitId) {
      (req as any).unitId = unitId;
    }
    next();
  }
}
