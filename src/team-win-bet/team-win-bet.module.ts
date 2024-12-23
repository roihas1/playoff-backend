import { Module } from '@nestjs/common';
import { TeamWinBetController } from './team-win-bet.controller';
import { TeamWinBetService } from './team-win-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamWinBetRepository]), AuthModule],
  controllers: [TeamWinBetController],
  providers: [TeamWinBetService, TeamWinBetRepository],
  exports: [TeamWinBetService],
})
export class TeamWinBetModule {}
