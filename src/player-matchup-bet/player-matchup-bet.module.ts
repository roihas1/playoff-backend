import { Module } from '@nestjs/common';
import { PlayerMatchupBetController } from './player-matchup-bet.controller';
import { PlayerMatchupBetService } from './player-matchup-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerMatchupBetRepository } from './player-matchup-bet.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerMatchupBetRepository]), AuthModule],
  controllers: [PlayerMatchupBetController],
  providers: [PlayerMatchupBetService, PlayerMatchupBetRepository],
})
export class PlayerMatchupBetModule {}
