import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { Conference } from 'src/series/conference.enum';

export class CreateChampGuessDto {
  champTeamGuess: {
    teamId: string;
    fantasyPoints?: number;
  };
  conferenceFinalGuess: {
    team1Id: string;
    team2Id: string;
    conference: Conference;
    fantasyPoints?: number;
  }[];
  mvpGuess: {
    player: string;
    fantasyPoints?: number;
  };
  stage: PlayoffsStage;
}
