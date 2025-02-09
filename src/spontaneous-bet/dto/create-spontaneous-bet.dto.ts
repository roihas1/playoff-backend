import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MatchupCategory } from 'src/player-matchup-bet/matchup-category.enum';
import { PlayerMatchupType } from 'src/player-matchup-bet/player-matchup-type.enum';

export class CreateSpontaneousBetDto {
  @IsUUID()
  @IsNotEmpty()
  seriesId: string;

  @IsEnum(PlayerMatchupType)
  typeOfMatchup: PlayerMatchupType;

  @IsArray()
  @IsEnum(MatchupCategory, { each: true })
  categories: MatchupCategory[];

  @IsNumber()
  fantasyPoints: number;

  @IsString()
  player1: string;

  @IsString()
  player2: string;

  @IsNumber()
  differential: number;

  @IsOptional()
  @IsNumber()
  result: number;

  @IsNumber()
  gameNumber: number;

  @IsDateString()
  startTime: string;
}
