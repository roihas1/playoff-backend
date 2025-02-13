import {
  IsNumber,
  IsIn,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateGuessesDto {
  @IsNumber()
  @IsOptional()
  @IsIn([1, 2])
  teamWinGuess?: number;
  @IsNumber()
  @IsOptional()
  @Min(4)
  @Max(7)
  bestOf7Guess?: number;

  @IsOptional()
  @IsObject()
  playermatchupGuess?: { [key: string]: number };
}
