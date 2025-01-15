import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from './user.entity';

export const GetUser = createParamDecorator(
  (_data, ctx: ExecutionContext): Partial<User> => {
    const req = ctx.switchToHttp().getRequest();
    const user: User = req.user;
    return {
      id: user.id,
      username: user.username,
    };
  },
);
