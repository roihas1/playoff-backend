import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTournamentPointsRepository } from './user-tournament-points.repository';
import { UserTournamentPointsService } from './user-tournament-points.service';
import { MergeUserTournamentPointsInterceptor } from './merge-user-tournament-points.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([UserTournamentPointsRepository])],
  providers: [
    UserTournamentPointsRepository,
    UserTournamentPointsService,
    MergeUserTournamentPointsInterceptor,
  ],
  exports: [UserTournamentPointsService, MergeUserTournamentPointsInterceptor],
})
export class UserTournamentPointsModule {}
