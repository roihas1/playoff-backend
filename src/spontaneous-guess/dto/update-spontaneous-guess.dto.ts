import { IsObject } from 'class-validator';

export class UpdateSpontaneousGuessesDto {
  @IsObject()
  spontaneousGuesses: { [key: string]: number };
}
