import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(4)
  @Max(7)
  result: number;
}
