import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import { Tournament } from './tournament.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament]), AuthModule],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService],
})
export class TournamentModule {}
