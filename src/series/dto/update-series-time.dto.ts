import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSeriesTimeDto {
  @IsOptional()
  @IsDateString()
  dateOfStart: string;
  @IsOptional()
  @IsString()
  timeOfStart: string;
}
