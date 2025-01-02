import { IsNumber, Max, Min } from 'class-validator';

export class UpdateGuessDto {
  @IsNumber()
  @Min(1)
  @Max(2)
  guess: number;

  // @IsString()
  // betId: string;
}
