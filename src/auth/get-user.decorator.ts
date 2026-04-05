import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from './user.entity';

type ScopedPoints = { fantasyPoints: number; championPoints: number };

/** JWT user plus tournament-scoped totals (not columns on User). */
export type AuthUserPayload = Pick<
  User,
  'id' | 'username' | 'firstName' | 'lastName'
> &
  ScopedPoints;

export const GetUser = createParamDecorator(
  (_data, ctx: ExecutionContext): AuthUserPayload => {
    const req = ctx.switchToHttp().getRequest();
    const user: User = req.user;
    const scoped = req.userTournamentScopedPoints as ScopedPoints | undefined;
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fantasyPoints: scoped?.fantasyPoints ?? 0,
      championPoints: scoped?.championPoints ?? 0,
    };
  },
);
