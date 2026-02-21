import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Team } from './team.entity';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team]),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TeamController],
  providers: [TeamRepository, TeamService],
  exports: [TeamService, TeamRepository],
})
export class TeamModule {}
