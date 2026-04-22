// src/series/dto/get-all-series-guesses.dto.ts

import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';

export type BestOf7PercentagesDto = {
  4: number;
  5: number;
  6: number;
  7: number;
};

export type BestOf7CountsDto = BestOf7PercentagesDto & {
  total: number;
};

export class GetAllSeriesGuessesDto {
  guesses: {
    bestOf7Guess: BestOf7Guess | null;
    teamWinGuess: TeamWinGuess | null;
    playerMatchupGuess: PlayerMatchupGuess[];
  };
  spontaneousGuesses: SpontaneousGuess[];
  percentages: {
    teamWin: { 1: number; 2: number };
    playerMatchup: { [key: string]: { 1: number; 2: number } };
    spontaneousMacthups: { [key: string]: { 1: number; 2: number } };
    bestOf7: BestOf7PercentagesDto;
  };
  bestOf7Counts: BestOf7CountsDto;
}
