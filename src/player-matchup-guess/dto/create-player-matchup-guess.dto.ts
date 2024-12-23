import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreatePlayerMatchupGuessDto {
  @IsNumber()
  @IsNotEmpty()
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  playerMatchupBetId: string;
}
