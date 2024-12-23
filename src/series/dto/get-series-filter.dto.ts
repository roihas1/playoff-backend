import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Coast } from '../Coast.enum';
import { Round } from '../round.enum';

export class GetSeriesWithFilterDto {
  @IsEnum(Round)
  @IsOptional()
  round?: Round;

  @IsEnum(Coast)
  @IsOptional()
  coast?: Coast;

  @IsString()
  @IsOptional()
  team?: string;
}
