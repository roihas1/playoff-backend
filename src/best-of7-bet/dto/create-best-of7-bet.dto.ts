import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateBestOf7BetDto {
  @IsUUID()
  @IsNotEmpty()
  seriesId: string;

  @IsNumber()
  @Min(0)
  fantasyPoints: number;
}
