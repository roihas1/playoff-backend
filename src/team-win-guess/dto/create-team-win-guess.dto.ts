import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateTeamWinGuessDto {
  @IsNumber()
  @IsNotEmpty()
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  teamWinBetId: string;
}
