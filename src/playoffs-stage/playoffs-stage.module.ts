import { forwardRef, Module } from '@nestjs/common';
import { PlayoffsStageController } from './playoffs-stage.controller';
import { PlayoffsStageService } from './playoffs-stage.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayoffStage } from './playoffs-stage.entity';
import { PlayoffsStageRepository } from './playoffs-stage.repository';
import { ChampionsGuessModule } from 'src/champions-guess/champions-guess.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayoffStage]),
    forwardRef(() => ChampionsGuessModule),
    AuthModule,
  ],
  controllers: [PlayoffsStageController],
  providers: [PlayoffsStageService, PlayoffsStageRepository],
  exports: [PlayoffsStageService],
})
export class PlayoffsStageModule {}
