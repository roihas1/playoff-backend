import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

function toBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return defaultValue;
}

export class GetGuessPageStatsQueryDto {
  @IsUUID()
  tournamentId: string;

  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value, true))
  includeSeries?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value, true))
  includeChampion?: boolean;
}
