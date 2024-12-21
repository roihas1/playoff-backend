import { IsString, IsDateString } from 'class-validator';

export class CreateSeriesDto {
  @IsString()
  team1: string;

  @IsString()
  team2: string;

  @IsString()
  round: string;

  @IsDateString()
  dateOfStart: string;
}
