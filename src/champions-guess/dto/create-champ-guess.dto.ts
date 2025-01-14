import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { Conference } from 'src/series/conference.enum';

export class CreateChampGuessDto {
  champTeamGuess: {
    team: string;
    fantasyPoints?: number;
  };
  conferenceFinalGuess: {
    team1: string;
    team2: string;
    conference: Conference;
    fantasyPoints?: number;
  }[];
  mvpGuess: {
    player: string;
    fantasyPoints?: number;
  };
  stage: PlayoffsStage;
}
