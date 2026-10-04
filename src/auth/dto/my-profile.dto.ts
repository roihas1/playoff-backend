import { Role } from '../user-role.enum';

export class MyProfileDto {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  hasPassword: boolean;
  hasGoogle: boolean;
}
