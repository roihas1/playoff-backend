import { IsNumber } from 'class-validator';

export class UpdateFantasyPointsDto {
  @IsNumber()
  fantasyPoints: number;
}
