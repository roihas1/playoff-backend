import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { User } from 'src/auth/user.entity';

export class RemoveUsersDto {
  @IsArray()
  users: User[];

  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}
