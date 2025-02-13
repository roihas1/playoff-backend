import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Round } from '../round.enum';
import { Conference } from '../conference.enum';

export class CreateSeriesDto {
  @IsString()
  team1: string;
  @IsString()
  team2: string;
  @IsNumber()
  @Min(1)
  @Max(8)
  seed1: number;
  @IsNumber()
  seed2: number;

  @IsEnum(Round)
  round: Round;
  @IsEnum(Conference)
  conference: Conference;
  @IsDateString()
  dateOfStart: string;
  @IsString()
  timeOfStart: string;
}
