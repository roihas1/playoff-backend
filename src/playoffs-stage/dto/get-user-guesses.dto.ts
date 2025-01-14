import { IsEnum } from 'class-validator';
import { PlayoffsStage } from '../playoffs-stage.enum';

export class GetUserGuessesDto {
  @IsEnum(PlayoffsStage)
  stage: PlayoffsStage;
}
