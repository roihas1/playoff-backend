import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*()]).{8,}$/, {
    message: 'password is too weak!',
  })
  password: string;
}
