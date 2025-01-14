import { IsNumber, IsOptional } from 'class-validator';

export class CreateGuessesDto {
  @IsNumber()
  @IsOptional()
  teamWinGuess?: number;
  @IsNumber()
  @IsOptional()
  bestOf7Guess?: number;

  @IsOptional()
  playermatchupGuess?: { [key: string]: number };
}
