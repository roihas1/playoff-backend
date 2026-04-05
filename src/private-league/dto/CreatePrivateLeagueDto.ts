import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePrivateLeagueDto {
  @IsString()
  @MaxLength(32)
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}
