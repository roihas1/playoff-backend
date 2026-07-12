import { IsOptional, IsString, IsUUID } from 'class-validator';

export class JoinLeagueDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}
