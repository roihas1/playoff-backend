import { IsString } from 'class-validator';

export class JoinLeagueDto {
  @IsString()
  code: string;
}
