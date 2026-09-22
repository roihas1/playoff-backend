import { forwardRef, Module } from '@nestjs/common';
import { SpontaneousGuessController } from './spontaneous-guess.controller';
import { SpontaneousGuessService } from './spontaneous-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpontaneousGuessRepo } from './spontaneous-guess.repository';
import { SpontaneousBetModule } from 'src/spontaneous-bet/spontaneous-bet.module';
import { UserMissingBetsModule } from 'src/user-missing-bets/user-missing-bets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpontaneousGuessRepo]),
    SpontaneousBetModule,
    forwardRef(() => UserMissingBetsModule),
  ],
  controllers: [SpontaneousGuessController],
  providers: [SpontaneousGuessService, SpontaneousGuessRepo],
  exports: [SpontaneousGuessService],
})
export class SpontaneousGuessModule {}
