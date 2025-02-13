import { IsIn, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateSpontaneousGuessDto {
  @IsNumber()
  @IsNotEmpty()
  @IsIn([1, 2])
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  spontaneousBetId: string;
}
