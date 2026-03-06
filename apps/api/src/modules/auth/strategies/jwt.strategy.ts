import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IJwtPayload } from '@menufacil/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          // Use X-Auth-Context header to determine which cookie to use
          const authContext = request?.headers?.['x-auth-context'] as string | undefined;
          if (authContext === 'customer') {
            return request?.cookies?.customer_token;
          }
          return request?.cookies?.accessToken || request?.cookies?.customer_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
    });
  }

  async validate(payload: IJwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      tenant_id: payload.tenant_id,
      role: payload.role,
      type: payload.type,
    };
  }
}
