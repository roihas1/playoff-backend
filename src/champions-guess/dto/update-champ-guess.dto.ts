import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';

export class UpdateChamionGuessDto {
  champTeamGuess: {
    teamId?: string;
    team?: string;
    fantasyPoints?: number;
  };
  mvpGuess: {
    player: string;
    fantasyPoints?: number;
  };
  stage: PlayoffsStage;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsUUID()
  @IsOptional()
  tournamentId?: string;
}
