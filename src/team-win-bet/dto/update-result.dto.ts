import { IsIn, IsNumber } from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  @IsIn([1, 2])
  result: number;
}
