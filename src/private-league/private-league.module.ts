import { Module } from '@nestjs/common';
import { PrivateLeagueController } from './private-league.controller';
import { PrivateLeagueService } from './private-league.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateLeagueRepository } from './private-league.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PrivateLeagueRepository]), AuthModule],
  controllers: [PrivateLeagueController],
  providers: [PrivateLeagueService, PrivateLeagueRepository],
})
export class PrivateLeagueModule {}
