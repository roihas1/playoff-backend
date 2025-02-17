import { IsArray } from 'class-validator';
import { User } from 'src/auth/user.entity';

export class RemoveUsersDto {
  @IsArray()
  users: User[];
}
