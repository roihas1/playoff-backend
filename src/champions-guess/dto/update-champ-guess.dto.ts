import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';

export class UpdateChamionGuessDto {
  @IsObject()
  champTeamGuess: {
    teamId?: string;
    team?: string;
    fantasyPoints?: number;
  };

  @IsObject()
  mvpGuess: {
    player: string;
    fantasyPoints?: number;
  };

  @IsEnum(PlayoffsStage)
  stage: PlayoffsStage;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsUUID()
  @IsOptional()
  tournamentId?: string;
}
