import { IsNumber } from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  result: number;
}
