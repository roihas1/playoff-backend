import { Module } from '@nestjs/common';
import { PlayerMatchupGuessController } from './player-matchup-guess.controller';
import { PlayerMatchupGuessService } from './player-matchup-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerMatchupGuessRepository } from './player-matchup-guess.repository';
import { AuthModule } from 'src/auth/auth.module';
import { PlayerMatchupBetModule } from 'src/player-matchup-bet/player-matchup-bet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerMatchupGuessRepository]),
    AuthModule,
    PlayerMatchupBetModule,
  ],
  controllers: [PlayerMatchupGuessController],
  providers: [PlayerMatchupGuessService, PlayerMatchupGuessRepository],
})
export class PlayerMatchupGuessModule {}
