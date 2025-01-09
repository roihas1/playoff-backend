import { IsString } from 'class-validator';

export class LogoutCredentialsDto {
  @IsString()
  username: string;
}
