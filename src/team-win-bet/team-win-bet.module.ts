import { forwardRef, Module } from '@nestjs/common';
import { TeamWinBetController } from './team-win-bet.controller';
import { TeamWinBetService } from './team-win-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { AuthModule } from '../auth/auth.module';
import { TeamWinGuessModule } from 'src/team-win-guess/team-win-guess.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamWinBetRepository]),
    AuthModule,
    forwardRef(() => TeamWinGuessModule),
  ],
  controllers: [TeamWinBetController],
  providers: [TeamWinBetService, TeamWinBetRepository],
  exports: [TeamWinBetService],
})
export class TeamWinBetModule {}
