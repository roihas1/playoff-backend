import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from './user.entity';

type ScopedPoints = { fantasyPoints: number; championPoints: number };

export const GetUser = createParamDecorator(
  (_data, ctx: ExecutionContext): Partial<User> => {
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
