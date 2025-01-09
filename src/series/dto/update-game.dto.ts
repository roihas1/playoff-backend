import { IsNumber } from 'class-validator';

export class UpdateGameDto {
  @IsNumber()
  teamWon: number;
}
