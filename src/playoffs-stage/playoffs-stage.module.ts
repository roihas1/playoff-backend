import { Module } from '@nestjs/common';
import { PlayoffsStageController } from './playoffs-stage.controller';
import { PlayoffsStageService } from './playoffs-stage.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayoffStage } from './playoffs-stage.entity';
import { PlayoffsStageRepository } from './playoffs-stage.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PlayoffStage])],
  controllers: [PlayoffsStageController],
  providers: [PlayoffsStageService, PlayoffsStageRepository],
  exports: [PlayoffsStageService],
})
export class PlayoffsStageModule {}
