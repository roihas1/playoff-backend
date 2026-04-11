import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PlayoffsStage } from '../playoffs-stage.enum';

export class CreatePlayoffsStageDto {
  @IsEnum(PlayoffsStage)
  name: PlayoffsStage;

  @IsUUID()
  @IsOptional()
  tournamentId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;
  @IsString()
  timeOfStart?: string;
}
