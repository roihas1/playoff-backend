import { Module } from '@nestjs/common';
import { SpontaneousGuessController } from './spontaneous-guess.controller';
import { SpontaneousGuessService } from './spontaneous-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpontaneousGuessRepo } from './spontaneous-guess.repository';
import { SpontaneousBetModule } from 'src/spontaneous-bet/spontaneous-bet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpontaneousGuessRepo]),
    SpontaneousBetModule,
  ],
  controllers: [SpontaneousGuessController],
  providers: [SpontaneousGuessService, SpontaneousGuessRepo],
  exports: [SpontaneousGuessService],
})
export class SpontaneousGuessModule {}
