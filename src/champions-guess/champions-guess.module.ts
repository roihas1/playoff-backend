import { Module } from '@nestjs/common';
import { ChampionsGuessController } from './champions-guess.controller';
import { ChampionsGuessService } from './champions-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChampionTeamGuess } from './entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from './entities/conference-final-guess.entity';
import { MVPGuess } from './entities/mvp-guess.entity';
import { PlayoffsStageModule } from 'src/playoffs-stage/playoffs-stage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChampionTeamGuess,
      ConferenceFinalGuess,
      MVPGuess,
    ]),
    PlayoffsStageModule,
  ],
  controllers: [ChampionsGuessController],
  providers: [ChampionsGuessService],
})
export class ChampionsGuessModule {}
