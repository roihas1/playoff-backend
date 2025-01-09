import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PlayerMatchupType } from '../player-matchup-type.enum';
import { MatchupCategory } from '../matchup-category.enum';
export class UpdateFieldsDto {
  @IsEnum(PlayerMatchupType)
  @IsOptional()
  typeOfMatchup: PlayerMatchupType;

  @IsEnum(MatchupCategory, { each: true })
  @IsOptional()
  categories: MatchupCategory[];

  @IsNumber()
  @IsOptional()
  fantasyPoints: number;

  @IsString()
  @IsOptional()
  player1: string;

  @IsString()
  @IsOptional()
  player2: string;

  @IsNumber()
  @IsOptional()
  differential: number;

  @IsOptional()
  currentStats: number[];
}
