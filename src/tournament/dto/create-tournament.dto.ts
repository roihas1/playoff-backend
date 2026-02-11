import { IsInt, IsString, Min, Max } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  sportType: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsString()
  name: string;
}
