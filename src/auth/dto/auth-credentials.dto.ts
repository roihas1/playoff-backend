import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
export class AuthCredentialsDto {
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
  password?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
  @IsString()
  @IsOptional()
  googleId?: string;
}
