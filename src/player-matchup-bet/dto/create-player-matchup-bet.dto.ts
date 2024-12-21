import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PlayerMatchupType } from '../player-matchup-type.enum';
import { MatchupCategory } from '../matchup-category.enum';

export class CreatePlayerMatchupBetDto {
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
}
