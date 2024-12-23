import { IsString, IsDateString, IsEnum } from 'class-validator';
import { Round } from '../round.enum';
import { Coast } from '../Coast.enum';

export class CreateSeriesDto {
  @IsString()
  team1: string;

  @IsString()
  team2: string;

  @IsEnum(Round)
  round: Round;
  @IsEnum(Coast)
  coast: Coast;
  @IsDateString()
  dateOfStart: string;
}
