import { IsIn, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateTeamWinGuessDto {
  @IsNumber()
  @IsNotEmpty()
  @IsIn([1, 2])
  guess: number;

  @IsUUID()
  @IsNotEmpty()
  teamWinBetId: string;
}
