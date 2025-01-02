import { IsArray, IsNumber } from 'class-validator';

export class CreateGuessesDto {
  @IsNumber()
  teamWinGuess: number;
  @IsNumber()
  bestOf7Guess: number;
  @IsArray()
  playermatchupGuess: { [key: number]: number };
}
