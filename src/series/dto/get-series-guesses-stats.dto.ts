// src/series/dto/get-all-series-guesses.dto.ts

import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';

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
  };
}
