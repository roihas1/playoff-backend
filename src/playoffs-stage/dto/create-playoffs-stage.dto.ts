import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PlayoffsStage } from '../playoffs-stage.enum';

export class CreatePlayoffsStageDto {
  @IsEnum(PlayoffsStage)
  name: PlayoffsStage;

  @IsDateString()
  @IsOptional()
  startDate?: string;
}
