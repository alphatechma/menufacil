import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUnit = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.unitId || null;
  },
);
