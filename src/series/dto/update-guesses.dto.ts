import { IsNumber, IsArray } from 'class-validator';

export class UpdateGuessesDto {
  @IsNumber()
  teamWinGuess?: number;
  @IsNumber()
  bestOf7Guess?: number;
  @IsArray()
  playermatchupGuess?: { [key: number]: number };
}
