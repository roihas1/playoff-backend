import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Conference } from '../conference.enum';
import { Round } from '../round.enum';

export class GetSeriesWithFilterDto {
  @IsEnum(Round)
  @IsOptional()
  round?: Round;

  @IsEnum(Conference)
  @IsOptional()
  coast?: Conference;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}
