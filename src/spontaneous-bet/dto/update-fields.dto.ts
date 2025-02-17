import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MatchupCategory } from 'src/player-matchup-bet/matchup-category.enum';
import { PlayerMatchupType } from 'src/player-matchup-bet/player-matchup-type.enum';

export class UpdateBetFieldsDto {
  @IsEnum(PlayerMatchupType)
  @IsOptional()
  typeOfMatchup?: PlayerMatchupType;

  @IsArray()
  @IsEnum(MatchupCategory, { each: true })
  @IsOptional()
  categories?: MatchupCategory[];

  @IsNumber()
  @IsOptional()
  fantasyPoints?: number;

  @IsString()
  @IsOptional()
  player1?: string;

  @IsString()
  @IsOptional()
  player2?: string;

  @IsNumber()
  @IsOptional()
  differential?: number;

  @IsOptional()
  @IsNumber()
  result?: number;

  @IsNumber()
  @IsOptional()
  gameNumber?: number;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsOptional()
  currentStats?: number[];
}
