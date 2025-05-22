import { IsObject, IsString } from 'class-validator';

export class UpdateSpontaneousGuessesDto {
  @IsObject()
  spontaneousGuesses: { [key: string]: number };

  @IsString()
  seriesId: string;
}
