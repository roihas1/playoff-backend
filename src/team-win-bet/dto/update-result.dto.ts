import { IsString } from 'class-validator';

export class UpdateResultDto {
  @IsString()
  result: string;
}
