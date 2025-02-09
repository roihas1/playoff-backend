import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateSpontaneousGuessDto {
  @IsNumber()
  @IsNotEmpty()
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  spontaneousBetId: string;
}
