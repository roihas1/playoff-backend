import { IsDateString, IsOptional } from 'class-validator';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';

export class UpdateChamionGuessDto {
  champTeamGuess: {
    team: string;
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
}
