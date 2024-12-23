import { IsNotEmpty, IsUUID, IsNumber } from 'class-validator';

export class CreateBestOf7GuessDto {
  @IsNumber()
  @IsNotEmpty()
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  bestOf7BetId: string;
}
