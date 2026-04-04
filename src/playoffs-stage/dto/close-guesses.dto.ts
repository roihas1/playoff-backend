import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CloseGuessesDto {
  @IsArray()
  @IsString({ each: true })
  westernConferenceFinal: string[];

  @IsArray()
  @IsString({ each: true })
  easternConferenceFinal: string[];

  @IsArray()
  @IsString({ each: true })
  finals: string[];

  @IsString()
  championTeamId: string;

  @IsString()
  mvp: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}
