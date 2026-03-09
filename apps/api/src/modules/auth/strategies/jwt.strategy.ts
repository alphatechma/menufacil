import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { IJwtPayload } from '@menufacil/shared';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
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

  async validate(payload: IJwtPayload & { iat?: number }) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    // Check token_revoked_at for user tokens
    if (payload.type === 'user' && payload.iat) {
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        select: ['id', 'token_revoked_at'],
      });

      if (user?.token_revoked_at) {
        const revokedAtSeconds = Math.floor(user.token_revoked_at.getTime() / 1000);
        if (payload.iat < revokedAtSeconds) {
          throw new UnauthorizedException('Session has been revoked');
        }
      }
    }

    return {
      id: payload.sub,
      tenant_id: payload.tenant_id,
      role: payload.role,
      type: payload.type,
      impersonated_by: payload.impersonated_by,
    };
  }
}
