import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePrivateLeagueDto {
  @IsString()
  @MaxLength(32)
  @IsNotEmpty()
  name: string;
}
