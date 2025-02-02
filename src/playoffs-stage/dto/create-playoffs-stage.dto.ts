import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PlayoffsStage } from '../playoffs-stage.enum';

export class CreatePlayoffsStageDto {
  @IsEnum(PlayoffsStage)
  name: PlayoffsStage;

  @IsDateString()
  @IsOptional()
  startDate?: string;
  @IsString()
  timeOfStart?: string;
}
