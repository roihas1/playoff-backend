import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateTeamWinBetDto {
  @IsUUID()
  @IsNotEmpty()
  seriesId: string;

  @IsNumber()
  @Min(0)
  fantasyPoints: number;
}
