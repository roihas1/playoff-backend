import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../jwt-payload.interface';
import { User } from '../user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<
    Pick<User, 'id' | 'username' | 'role' | 'firstName' | 'lastName'>
  > {
    if (!payload?.sub || !payload.username || !payload.role) {
      throw new UnauthorizedException('Unauthorized access');
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
    };
  }
}
