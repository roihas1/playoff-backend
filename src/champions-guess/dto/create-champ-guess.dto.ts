import { IsArray, IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { Conference } from 'src/series/conference.enum';

export class CreateChampGuessDto {
  @IsObject()
  champTeamGuess: {
    teamId?: string;
    team?: string;
    fantasyPoints?: number;
  };

  @IsArray()
  @IsObject({ each: true })
  conferenceFinalGuess: {
    team1Id?: string;
    team2Id?: string;
    team1?: string;
    team2?: string;
    conference: Conference;
    fantasyPoints?: number;
  }[];

  @IsObject()
  mvpGuess: {
    player: string;
    fantasyPoints?: number;
  };

  @IsEnum(PlayoffsStage)
  stage: PlayoffsStage;

  @IsUUID()
  @IsOptional()
  tournamentId?: string;
}
