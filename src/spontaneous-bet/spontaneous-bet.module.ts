import { forwardRef, Module } from '@nestjs/common';
import { SpontaneousBetController } from './spontaneous-bet.controller';
import { SpontaneousBetService } from './spontaneous-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpontaneousBetRepo } from './spontaneous-bet.repository';
import { UserMissingBetsModule } from 'src/user-missing-bets/user-missing-bets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpontaneousBetRepo]),
    forwardRef(() => UserMissingBetsModule),
  ],
  controllers: [SpontaneousBetController],
  providers: [SpontaneousBetService, SpontaneousBetRepo],
  exports: [SpontaneousBetService],
})
export class SpontaneousBetModule {}
