import { Role } from './user-role.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  firstName: string;
  lastName: string;
}
