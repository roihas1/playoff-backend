import { IsNumber, Max, Min } from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  @Min(1)
  @Max(2)
  result: number;
}
