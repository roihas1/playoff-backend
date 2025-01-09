import { IsNumber, Min, Max } from 'class-validator';

export class UpdateResultTeamGamesDto {
  @IsNumber()
  @Min(4)
  @Max(7)
  numOfGames: number;

  @IsNumber()
  wonTeam: number;
}
